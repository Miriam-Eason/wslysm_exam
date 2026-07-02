#!/bin/sh
# 应用启动入口：若未显式提供 DATABASE_URL，则按 MYSQL_* 自动拼装
# （主机名固定为 compose 服务名 db）。这样部署时只需填数据库口令，无需手拼连接串。
set -e

: "${DATABASE_URL:=mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@db:3306/${MYSQL_DATABASE}}"
export DATABASE_URL

exec node server.js
