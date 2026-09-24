#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "== RentFlow =="

# ---------- Backend: http://127.0.0.1:8000 ----------
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[env] Created .env from .env.example — fill SMTP_* to send real OTP emails"
fi

if [ -f backend.pid ] && kill -0 "$(cat backend.pid)" 2>/dev/null; then
  kill "$(cat backend.pid)" 2>/dev/null || true
  sleep 1
fi
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload > backend.log 2>&1 &
echo $! > backend.pid

backend_up=0
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
    backend_up=1
    break
  fi
  sleep 1
done
if [ "$backend_up" = "1" ]; then
  echo "[backend] OK http://127.0.0.1:8000 (log: backend.log)"
else
  echo "[backend] FAILED to start — see backend.log"
  exit 1
fi

# ---------- Frontend: http://<server-ip>:3000 ----------
cd frontend
if [ ! -f .env ]; then
  cp .env.example .env
fi
if [ ! -d node_modules ]; then
  npm install
fi

if curl -sf -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
  echo "[frontend] Already running: http://<server-ip>:3000"
  exit 0
fi

echo "[frontend] Starting: http://0.0.0.0:3000"
exec npm run dev -- --host
