#!/usr/bin/env bash
set -euo pipefail

if [ -n "${POSTGRES_HOST:-}" ]; then
  echo "Esperando a PostgreSQL en ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}..."
  until python - <<'PYEOF'
import os
import socket
import sys

host = os.environ["POSTGRES_HOST"]
port = int(os.environ.get("POSTGRES_PORT", 5432))

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    s.close()
PYEOF
  do
    sleep 1
  done
  echo "PostgreSQL disponible."
fi

python manage.py migrate --noinput

if [ "${DJANGO_COLLECTSTATIC:-1}" = "1" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
