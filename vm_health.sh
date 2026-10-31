#!/usr/bin/env bash
set -euo pipefail

THRESHOLD=60
EXPLAIN=false

for arg in "$@"; do
  case "$arg" in
    Explain|explain|--explain) EXPLAIN=true ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [Explain]" >&2
      exit 2
      ;;
  esac
done

if [[ ! -r /proc/stat || ! -r /proc/meminfo ]]; then
  echo "This script requires a Linux system (/proc filesystem)." >&2
  exit 1
fi

read_cpu_counters() {
  awk '/^cpu /{ total=0; for (i=2; i<=NF; i++) total+=$i; print total, $5+$6 }' /proc/stat
}

read -r cpu_total1 cpu_idle1 < <(read_cpu_counters)
sleep 1
read -r cpu_total2 cpu_idle2 < <(read_cpu_counters)
cpu_pct=$(awk -v t1="$cpu_total1" -v i1="$cpu_idle1" -v t2="$cpu_total2" -v i2="$cpu_idle2" \
  'BEGIN { dt = t2 - t1; di = i2 - i1; if (dt <= 0) print 0; else printf "%.1f", (dt - di) * 100 / dt }')

mem_pct=$(awk '/^MemTotal:/{t=$2} /^MemAvailable:/{a=$2} END{ if (t > 0) printf "%.1f", (t - a) * 100 / t; else print 0 }' /proc/meminfo)

read -r disk_pct disk_mount < <(df -P 2>/dev/null \
  | awk 'NR > 1 && $2 > 0 && $6 !~ /^\/(dev|sys|proc|run)(\/|$)/ { p = $5; gsub("%", "", p); if (!found || p + 0 > max) { max = p + 0; mp = $6; found = 1 } } END { if (found) printf "%d %s\n", max, mp; else print "0 /" }')

is_above_threshold() {
  awk -v v="$1" -v t="$THRESHOLD" 'BEGIN { exit !(v + 0 > t + 0) }'
}

reasons=()
is_above_threshold "$cpu_pct" && reasons+=("CPU usage is ${cpu_pct}%, above the ${THRESHOLD}% limit.")
is_above_threshold "$mem_pct" && reasons+=("Memory usage is ${mem_pct}%, above the ${THRESHOLD}% limit.")
is_above_threshold "$disk_pct" && reasons+=("Disk usage is ${disk_pct}% on ${disk_mount}, above the ${THRESHOLD}% limit.")

if (( ${#reasons[@]} > 0 )); then
  status="UNHEALTHY"
else
  status="HEALTHY"
fi

echo "VM Health Status: ${status}"

json_string() {
  local s=${1//\\/\\\\}
  s=${s//\"/\\\"}
  printf '"%s"' "$s"
}

report_to_dashboard() {
  local machine_name="${HEALTH_MACHINE_NAME:-$(cat /proc/sys/kernel/hostname)}"
  local payload
  payload=$(printf '{"machine_name":%s,"cpu_pct":%s,"mem_pct":%s,"disk_pct":%s,"disk_mount":%s}' \
    "$(json_string "$machine_name")" "$cpu_pct" "$mem_pct" "$disk_pct" "$(json_string "$disk_mount")")

  if ! curl -fsS --max-time 10 -X POST -H "Content-Type: application/json" \
    -K <(printf 'header = "Authorization: Bearer %s"\n' "$HEALTH_REPORT_KEY") \
    --data "$payload" "$HEALTH_REPORT_URL" >/dev/null; then
    echo "Warning: could not send the health report to the dashboard." >&2
  fi
}

if [[ -n "${HEALTH_REPORT_URL:-}" ]]; then
  if [[ -n "${HEALTH_REPORT_KEY:-}" ]]; then
    report_to_dashboard
  else
    echo "Warning: HEALTH_REPORT_KEY is not set; skipping the dashboard report." >&2
  fi
fi

if [[ "$EXPLAIN" == true ]]; then
  echo
  echo "Metrics:"
  echo "  CPU utilisation:    ${cpu_pct}%"
  echo "  Memory utilisation: ${mem_pct}%"
  echo "  Disk utilisation:   ${disk_pct}% (highest: ${disk_mount})"
  echo
  echo "Reason:"
  if (( ${#reasons[@]} > 0 )); then
    for reason in "${reasons[@]}"; do
      echo "  - ${reason}"
    done
    echo "  The VM is unhealthy because at least one resource exceeds ${THRESHOLD}%."
  else
    echo "  All resources (CPU, memory, disk) are at or below ${THRESHOLD}%."
    echo "  The VM is healthy."
  fi
fi
