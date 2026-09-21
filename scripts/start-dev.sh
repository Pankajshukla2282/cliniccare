#!/usr/bin/env bash
set -Eeuo pipefail

# ClinicCare cross-platform local development launcher.
# Starts PostgreSQL via Kubernetes port-forward when needed, then API + Next.js web.
# Usage: bash scripts/start-dev.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="${LOG_DIR:-$REPO_ROOT/logs}"
mkdir -p "$LOG_DIR"

load_env() {
  local env_file="$REPO_ROOT/.env"
  [[ -f "$env_file" ]] || { echo "[ERROR] .env not found. Copy .env.example to .env."; exit 1; }
  set -a
  # shellcheck disable=SC1091
  source "$env_file"
  set +a
}

load_env

: "${DATABASE_URL:?DATABASE_URL is required in .env}"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3100}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-3000}"
POSTGRES_LOCAL_PORT="${POSTGRES_LOCAL_PORT:-5432}"
DEV_INFRA_MODE="${DEV_INFRA_MODE:-auto}"
K8S_NAMESPACE="${K8S_NAMESPACE:-cliniccare}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
API_HEALTH_PATH="${API_HEALTH_PATH:-/healthz}"
WEB_HEALTH_PATH="${WEB_HEALTH_PATH:-/healthz}"
API_URL="${API_URL:-http://127.0.0.1:${API_PORT}}"

pids=()
cleanup() {
  local code=$?
  trap - EXIT INT TERM
  echo
  echo "[STOP] Stopping ClinicCare development processes..."
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "[OK] ClinicCare stopped."
  exit "$code"
}
trap cleanup EXIT INT TERM

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "[ERROR] $1 not found."; exit 1; }; }
for cmd in node npm curl; do need_cmd "$cmd"; done
[[ "$DEV_INFRA_MODE" == "local" || "$DEV_INFRA_MODE" == "k8s" || "$DEV_INFRA_MODE" == "auto" ]] || { echo "[ERROR] DEV_INFRA_MODE must be local, k8s, or auto."; exit 1; }

port_open() {
  local port="$1"
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1 && return 0
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1 && { exec 3>&-; return 0; }
  return 1
}

wait_http() {
  local url="$1" timeout="${2:-45}" i
  for ((i=1;i<=timeout;i++)); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

echo "=============================================="
echo " ClinicCare local development"
echo "=============================================="
echo "API : $API_URL"
echo "Web : http://${WEB_HOST}:${WEB_PORT}"
echo "Env : ${APP_ENV:-development}"
echo "Infra: $DEV_INFRA_MODE (local | k8s | auto)"
echo

USE_K8S=0
if [[ "$DEV_INFRA_MODE" == "k8s" ]]; then
  USE_K8S=1
elif [[ "$DEV_INFRA_MODE" == "auto" ]] && command -v kubectl >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  USE_K8S=1
  echo "[OK] Kubernetes cluster reachable; using Kubernetes services."
elif [[ "$DEV_INFRA_MODE" == "auto" ]]; then
  echo "[INFO] Kubernetes is not reachable; using local PostgreSQL."
fi

if [[ "$USE_K8S" -eq 1 ]]; then
  command -v kubectl >/dev/null 2>&1 || { echo "[ERROR] kubectl is required when DEV_INFRA_MODE=k8s."; exit 1; }
  kubectl cluster-info >/dev/null 2>&1 || { echo "[ERROR] Kubernetes is not reachable."; exit 1; }
  kubectl get namespace "$K8S_NAMESPACE" >/dev/null 2>&1 || { echo "[ERROR] Namespace '$K8S_NAMESPACE' does not exist."; exit 1; }
  kubectl get svc "$POSTGRES_SERVICE" -n "$K8S_NAMESPACE" >/dev/null 2>&1 || { echo "[ERROR] Service '$POSTGRES_SERVICE' does not exist."; exit 1; }
fi

start_forward() {
  local name="$1" port="$2" target="$3" log="$4" remote_port="$5"
  if port_open "$port"; then
    echo "[OK] $name already listening on $port"
    return
  fi
  echo "[START] $name port-forward -> localhost:$port"
  [[ "$USE_K8S" -eq 1 ]] || { echo "[ERROR] $name is not available on localhost:$port and Kubernetes is disabled/unreachable."; exit 1; }
  kubectl port-forward -n "$K8S_NAMESPACE" "$target" "$port:$remote_port" >"$LOG_DIR/${log}.log" 2>&1 &
  local pid=$!
  pids+=("$pid")
  for _ in {1..30}; do
    if port_open "$port"; then echo "[OK] $name ready"; return; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "[ERROR] $name port-forward exited. See $LOG_DIR/${log}.log"
      cat "$LOG_DIR/${log}.log" 2>/dev/null || true
      exit 1
    fi
    sleep 1
  done
  echo "[ERROR] Timed out waiting for $name."
  exit 1
}

start_forward "PostgreSQL" "$POSTGRES_LOCAL_PORT" "svc/$POSTGRES_SERVICE" "postgres-port-forward" 5432

echo "[START] API"
npm run dev --workspace=@cliniccare/api >"$LOG_DIR/api.log" 2>&1 &
API_PID=$!
pids+=("$API_PID")
if ! wait_http "$API_URL$API_HEALTH_PATH" 45; then
  echo "[ERROR] API did not become healthy. See $LOG_DIR/api.log"
  tail -n 100 "$LOG_DIR/api.log" 2>/dev/null || true
  exit 1
fi
echo "[OK] API healthy: $API_URL$API_HEALTH_PATH"

echo "[START] Web"
# Pass only supported Next.js dev-server flags.
npm run dev --workspace=@cliniccare/web -- --hostname "$WEB_HOST" --port "$WEB_PORT" >"$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
pids+=("$WEB_PID")
if ! wait_http "http://127.0.0.1:$WEB_PORT$WEB_HEALTH_PATH" 60; then
  echo "[ERROR] Web did not become healthy. See $LOG_DIR/web.log"
  tail -n 120 "$LOG_DIR/web.log" 2>/dev/null || true
  exit 1
fi
echo "[OK] Web healthy: http://127.0.0.1:$WEB_PORT$WEB_HEALTH_PATH"

echo
echo "ClinicCare is running."
echo "  Web: http://127.0.0.1:$WEB_PORT"
echo "  API: $API_URL"
echo "  API health: $API_URL$API_HEALTH_PATH"
echo "  Logs: $LOG_DIR"
echo
echo "Press Ctrl+C to stop."

wait
