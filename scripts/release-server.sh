#!/usr/bin/env bash
set -euo pipefail
umask 077

action=${1:-}
release_sha=${2:-}
if [[ ! $release_sha =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full 40-character commit SHA" >&2
  exit 2
fi

deploy_root=${DEPLOY_ROOT:-$HOME/wxlysm_exam_deploy}
release_dir=$deploy_root/releases/$release_sha
shared_dir=$deploy_root/shared
env_file=$shared_dir/.env.production
maintenance_dir=$shared_dir/maintenance
db_container=wxlysm-exam-sys-db-1
app_container=wxlysm-exam-sys-app-1

if [[ ! -f $release_dir/docker-compose.yml ]]; then
  echo "Release directory is incomplete: $release_dir" >&2
  exit 1
fi

compose() {
  sudo env RELEASE_SHA="$release_sha" docker compose \
    --env-file "$env_file" \
    -f "$release_dir/docker-compose.yml" \
    --project-directory "$release_dir" "$@"
}

db_query() {
  sudo docker exec "$db_container" sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -N -B -e "$1"' \
    sh "$1"
}

root_query() {
  sudo docker exec "$db_container" sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE" -N -B -e "$1"' \
    sh "$1"
}

recent_attempts() {
  db_query "SELECT COUNT(*) FROM Attempt WHERE status='IN_PROGRESS' AND COALESCE(lastSavedAt, startedAt) >= NOW() - INTERVAL 2 MINUTE;"
}

row_counts() {
  db_query 'SELECT (SELECT COUNT(*) FROM Teacher), (SELECT COUNT(*) FROM Student), (SELECT COUNT(*) FROM Question), (SELECT COUNT(*) FROM Exam), (SELECT COUNT(*) FROM Attempt);'
}

check_pending_migrations() {
  local applied name file sql pattern
  applied=$(root_query 'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;')
  pattern='^ALTER TABLE `[A-Za-z0-9_]+` ADD COLUMN `[A-Za-z0-9_]+` (JSON|TEXT|LONGTEXT|INT|BIGINT|DOUBLE|VARCHAR\([0-9]+\)|DATETIME\([0-9]+\)) NULL;$'
  for file in "$release_dir"/prisma/migrations/*/migration.sql; do
    name=$(basename "$(dirname "$file")")
    if grep -Fxq "$name" <<<"$applied"; then
      continue
    fi
    if [[ $name == 20260702000000_initial_baseline ]]; then
      echo "Production baseline is not registered; stop and complete the one-time schema audit" >&2
      exit 1
    fi
    sql=$(sed '/^[[:space:]]*--/d; /^[[:space:]]*$/d' "$file" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')
    if [[ ! $sql =~ $pattern ]]; then
      echo "Migration $name requires a separate manual release review" >&2
      exit 1
    fi
    echo "Allowed additive migration: $name"
  done
}

case $action in
  bootstrap)
    mkdir -p "$shared_dir/nginx/conf.d" "$maintenance_dir" "$shared_dir/backups"
    chmod 700 "$shared_dir" "$shared_dir/backups"
    chmod 755 "$shared_dir/nginx" "$shared_dir/nginx/conf.d" "$maintenance_dir"
    if [[ ! -f $env_file ]]; then
      cp "$HOME/wxlysm_exam_sys/.env.production" "$env_file"
      chmod 600 "$env_file"
    fi
    if ! grep -q '^AUTH_SECRET=' "$env_file"; then
      secret_line=$(sed -n 's/^NEXTAUTH_SECRET=/AUTH_SECRET=/p' "$env_file" | head -n 1)
      [[ -n $secret_line ]] || { echo "Existing NEXTAUTH_SECRET is missing" >&2; exit 1; }
      printf '\n%s\n' "$secret_line" >> "$env_file"
    fi
    grep -q '^AUTH_URL=' "$env_file" || printf 'AUTH_URL=https://tk.wxlysm.com.cn\n' >> "$env_file"
    grep -q '^MYSQL_IMAGE=' "$env_file" || printf 'MYSQL_IMAGE=mysql:8.0\n' >> "$env_file"
    grep -q '^NGINX_CONFIG_DIR=' "$env_file" || printf 'NGINX_CONFIG_DIR=%s/nginx/conf.d\n' "$shared_dir" >> "$env_file"
    grep -q '^MAINTENANCE_DIR=' "$env_file" || printf 'MAINTENANCE_DIR=%s\n' "$maintenance_dir" >> "$env_file"
    if [[ ! -f $shared_dir/nginx/conf.d/default.conf ]]; then
      cp "$release_dir/nginx/conf.d/default.conf" "$shared_dir/nginx/conf.d/default.conf"
    elif ! cmp -s "$release_dir/nginx/conf.d/default.conf" "$shared_dir/nginx/conf.d/default.conf"; then
      echo "Nginx config changed; review and update the shared config separately" >&2
      exit 1
    fi
    cp "$release_dir/nginx/maintenance/maintenance.html" "$maintenance_dir/maintenance.html"
    chmod 644 "$shared_dir/nginx/conf.d/default.conf" "$maintenance_dir/maintenance.html"
    chmod 600 "$env_file"
    echo "Shared deployment files are ready"
    ;;
  build)
    sudo -v
    compose build migrate app
    ;;
  bootstrap-nginx)
    sudo -v
    compose up -d --no-deps --no-build nginx
    sudo docker exec wxlysm-exam-sys-nginx-1 nginx -t
    test "$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' http://127.0.0.1/)" = 200
    ;;
  check)
    sudo -v
    check_pending_migrations
    count=$(recent_attempts)
    if [[ $count != 0 ]]; then
      echo "$count attempts have recent save activity; postpone this release" >&2
      exit 1
    fi
    echo "No recent attempt saves"
    ;;
  maintenance-on)
    sudo -v
    count=$(recent_attempts)
    if [[ $count != 0 ]]; then
      echo "$count attempts have recent save activity; postpone this release" >&2
      exit 1
    fi
    touch "$maintenance_dir/active"
    test "$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' http://127.0.0.1/)" = 503
    sleep 30
    echo "Maintenance gate is active"
    ;;
  backup)
    stamp=${3:-}
    [[ $stamp =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Invalid backup timestamp" >&2; exit 2; }
    [[ -f $maintenance_dir/active ]] || { echo "Maintenance gate is not active" >&2; exit 1; }
    sudo -v
    target=$shared_dir/backups/wxlysm-exam-$stamp-$release_sha.sql.gz
    temp=$(mktemp "$shared_dir/backups/.dump.XXXXXXXX")
    chmod 600 "$temp"
    if ! sudo docker exec "$db_container" sh -c \
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --events --hex-blob --set-gtid-purged=OFF --default-character-set=utf8mb4 "$MYSQL_DATABASE"' > "$temp"; then
      rm -f "$temp"
      echo "Database export failed" >&2
      exit 1
    fi
    gzip -n "$temp"
    mv "$temp.gz" "$target"
    gzip -t "$target"
    row_counts > "$shared_dir/backups/pre-counts-$release_sha.txt"
    echo "Backup ready: $target"
    ;;
  migrate-switch)
    [[ -f $maintenance_dir/active ]] || { echo "Maintenance gate is not active" >&2; exit 1; }
    sudo -v
    check_pending_migrations
    [[ -s $shared_dir/backups/pre-counts-$release_sha.txt ]] || { echo "Pre-release counts are missing" >&2; exit 1; }
    compose run --rm --no-deps migrate
    compose up -d --no-deps --no-build app
    for _ in {1..30}; do
      status=$(sudo docker inspect --format '{{.State.Health.Status}}' "$app_container" 2>/dev/null || true)
      [[ $status == healthy ]] && break
      sleep 5
    done
    [[ ${status:-} == healthy ]] || { echo "New app did not become healthy" >&2; exit 1; }
    actual=$(row_counts)
    expected=$(<"$shared_dir/backups/pre-counts-$release_sha.txt")
    [[ $actual == "$expected" ]] || { echo "Business table row counts changed unexpectedly" >&2; exit 1; }
    sudo docker exec "$app_container" node -e \
      "Promise.all(['/api/health','/teacher/login','/student/login'].map(p=>fetch('http://127.0.0.1:3000'+p).then(r=>r.ok))).then(v=>process.exit(v.every(Boolean)?0:1)).catch(()=>process.exit(1))"
    echo "Application and data checks passed"
    ;;
  maintenance-off)
    [[ -f $maintenance_dir/active ]] || { echo "Maintenance gate is not active" >&2; exit 1; }
    rm "$maintenance_dir/active"
    if ! curl --max-time 10 --fail --silent http://127.0.0.1/api/health >/dev/null; then
      touch "$maintenance_dir/active"
      echo "Public health check failed; maintenance gate remains active" >&2
      exit 1
    fi
    printf '%s\n' "$release_sha" > "$shared_dir/current-release"
    echo "Release $release_sha is live"
    ;;
  restore-app)
    [[ -f $maintenance_dir/active ]] || { echo "Only restore the previous app while maintenance is active" >&2; exit 1; }
    sudo -v
    compose up -d --no-deps --no-build app
    ;;
  *)
    echo "Usage: $0 {bootstrap|build|bootstrap-nginx|check|maintenance-on|backup|migrate-switch|maintenance-off|restore-app} SHA [timestamp]" >&2
    exit 2
    ;;
esac
