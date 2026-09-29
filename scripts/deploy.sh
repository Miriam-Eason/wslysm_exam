#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  echo "Usage: $0 [--stage] <release-tag-or-full-commit-sha>" >&2
  exit 2
}

stage_only=0
if [[ ${1:-} == --stage ]]; then
  stage_only=1
  shift
fi
[[ $# == 1 ]] || usage
ref=$1

repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root"
[[ -z $(git status --porcelain) ]] || { echo "Working tree must be clean" >&2; exit 1; }

if [[ $ref =~ ^[0-9a-f]{40}$ ]]; then
  release_sha=$ref
else
  git show-ref --verify --quiet "refs/tags/$ref" || usage
  release_sha=$(git rev-parse --verify "refs/tags/$ref^{commit}")
  remote_tag_sha=$(git ls-remote origin "refs/tags/$ref^{}" | awk 'NR == 1 { print $1 }')
  if [[ -z $remote_tag_sha ]]; then
    remote_tag_sha=$(git ls-remote origin "refs/tags/$ref" | awk 'NR == 1 { print $1 }')
  fi
  [[ $remote_tag_sha == "$release_sha" ]] || { echo "Push the release tag before deploying" >&2; exit 1; }
fi
git cat-file -e "$release_sha^{commit}"
git merge-base --is-ancestor "$release_sha" main || { echo "Release must be on main" >&2; exit 1; }
remote_main=$(git ls-remote --exit-code origin refs/heads/main | awk '{print $1}')
[[ $(git rev-parse main) == "$remote_main" ]] || { echo "Push main before deploying" >&2; exit 1; }
git merge-base --is-ancestor "$release_sha" "$remote_main" || { echo "Release is not on origin/main" >&2; exit 1; }

deploy_host=${DEPLOY_HOST:-tk@10.1.2.20}
remote_root=/home/tk/wxlysm_exam_deploy
release_dir=$remote_root/releases/$release_sha
backup_dir=$repo_root/backup
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
git check-ignore --quiet backup/example.sql.gz || { echo "backup/ must be ignored by Git" >&2; exit 1; }

temp_dir=$(mktemp -d)
control_socket=$temp_dir/ssh-control
ssh_opts=(-o ControlPath="$control_socket")
maintenance_started=0
cleanup() {
  result=$?
  if (( result != 0 && maintenance_started )); then
    echo "Release stopped after entering maintenance. The gate remains active." >&2
    echo "Inspect the app and migration logs before using the previous release." >&2
    previous_release=$(ssh "${ssh_opts[@]}" "$deploy_host" "cat '$remote_root/shared/current-release' 2>/dev/null" || true)
    if [[ $previous_release =~ ^[0-9a-f]{40}$ ]]; then
      echo "Previous app recovery: bash '$remote_root/releases/$previous_release/scripts/release-server.sh' restore-app '$previous_release'" >&2
    else
      echo "Legacy app recovery: cd /home/tk/wxlysm_exam_sys && sudo docker compose --env-file .env.production up -d --no-deps --no-build app" >&2
    fi
    echo "Do not restore the production database automatically." >&2
  fi
  ssh -o BatchMode=yes -S "$control_socket" -O exit "$deploy_host" >/dev/null 2>&1 || true
  rm -f "$temp_dir/source.tar.gz" "$control_socket"
  rmdir "$temp_dir" 2>/dev/null || true
  exit "$result"
}
trap cleanup EXIT

ssh -M -N -f -o ControlPath="$control_socket" -o ControlPersist=600 "$deploy_host"
ssh_run() {
  local action=$1
  shift
  ssh -tt "${ssh_opts[@]}" "$deploy_host" \
    "bash '$release_dir/scripts/release-server.sh' '$action' '$release_sha' $*"
}

git archive --format=tar "$release_sha" | gzip -n > "$temp_dir/source.tar.gz"
archive_hash=$(shasum -a 256 "$temp_dir/source.tar.gz" | awk '{print $1}')
ssh "${ssh_opts[@]}" "$deploy_host" "mkdir -p '$release_dir'"
scp "${ssh_opts[@]}" "$temp_dir/source.tar.gz" "$deploy_host:$release_dir/source.tar.gz"
remote_hash=$(ssh "${ssh_opts[@]}" "$deploy_host" "sha256sum '$release_dir/source.tar.gz' | cut -d' ' -f1")
[[ $archive_hash == "$remote_hash" ]] || { echo "Uploaded archive checksum mismatch" >&2; exit 1; }
ssh "${ssh_opts[@]}" "$deploy_host" "tar -xzf '$release_dir/source.tar.gz' -C '$release_dir'"

ssh_run bootstrap
ssh_run build
if (( stage_only )); then
  echo "Staged and built $release_sha; production services were not switched"
  exit 0
fi

ssh_run check
ssh_run bootstrap-nginx
maintenance_started=1
ssh_run maintenance-on

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_name=wxlysm-exam-$stamp-$release_sha.sql.gz
ssh_run backup "$stamp"
scp "${ssh_opts[@]}" "$deploy_host:$remote_root/shared/backups/$backup_name" "$backup_dir/$backup_name"
gzip -t "$backup_dir/$backup_name"
[[ -s $backup_dir/$backup_name ]] || { echo "Local backup is empty" >&2; exit 1; }

ssh_run migrate-switch
ssh_run maintenance-off
maintenance_started=0

while IFS= read -r old_backup; do
  rm -f "$old_backup"
done < <(printf '%s\n' "$backup_dir"/wxlysm-exam-*.sql.gz | sort -r | tail -n +4)

echo "Deployed $release_sha; backup: $backup_dir/$backup_name"
