#!/bin/bash
# scripts/delegate-loki.sh — Loki(Image Gen) 실행 래퍼
#
# Usage: bash scripts/delegate-loki.sh TP-NNN
#
# 현재 상태:
#   - 실제 이미지 생성 API는 아직 미연동
#   - TP 확인, 로그 기록, RP 생성, watchdog/lock/rotation만 수행

set -euo pipefail

# ─── 설정 ───
TIMEOUT=300          # 전체 타임아웃 (5분)
STALL_TIMEOUT=60     # 출력 정체 감지 (60초 무출력 시 kill)
MAX_LOG_SIZE=2097152 # 최대 로그 크기 2MB
LOG_FILE="artifacts/logs/execution.log"

# ─── TP_ID 파싱 및 검증 ───
TP_ID="${1:?Usage: delegate-loki.sh TP-NNN}"

if [[ ! "$TP_ID" =~ ^TP-[0-9]{3,}(-[a-z]+)?$ ]]; then
    echo "Error: invalid TP_ID format: '$TP_ID'"
    echo "   Expected: TP-NNN or TP-NNN-suffix (e.g. TP-013, TP-013-image)"
    exit 1
fi

RP_ID="${TP_ID/TP/RP}"

# ─── 색상 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── 사전 검증 ───
TP_FILE="artifacts/handoff/${TP_ID}.md"
RP_FILE="artifacts/handoff/${RP_ID}.md"

if [ ! -f "$TP_FILE" ]; then
    echo -e "${RED}Error: TP file not found: ${TP_FILE}${NC}"
    exit 1
fi

# TP 파일 읽기 및 제목 파싱
TP_TITLE=$(grep -m1 '^# ' "$TP_FILE" | sed 's/^# //' || true)
if [ -z "$TP_TITLE" ]; then
    TP_TITLE="$TP_ID"
fi

# ─── macOS timeout 호환성 ───
TIMEOUT_CMD=""
if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &>/dev/null; then
    TIMEOUT_CMD="timeout"
else
    echo -e "${YELLOW}Warning: timeout command not found. Watchdog-only protection.${NC}"
    echo "   Recommended: brew install coreutils (for gtimeout)"
fi

# ─── 로그 디렉토리 확인 ───
mkdir -p artifacts/logs

# ─── 동시 실행 Lock ───
LOCK_DIR="artifacts/logs/.loki.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    LOCK_PID=$(cat "$LOCK_DIR/pid" 2>/dev/null || echo "unknown")
    if [ "$LOCK_PID" != "unknown" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo -e "${RED}Error: Loki is already running (PID: ${LOCK_PID}).${NC}"
        echo "   Wait for it to finish or kill it: kill $LOCK_PID"
        exit 1
    else
        echo -e "${YELLOW}Warning: Stale lock detected (PID: ${LOCK_PID}). Reclaiming.${NC}"
        rm -rf "$LOCK_DIR"
        mkdir "$LOCK_DIR"
    fi
fi
echo $$ > "$LOCK_DIR/pid"

# ─── 로그 로테이션 ───
MAX_EXEC_LOG_SIZE=1048576  # 1MB
MAX_EXEC_LOG_FILES=5
rotate_log() {
    local logfile="$1"
    [ ! -f "$logfile" ] && return
    local size
    size=$(wc -c < "$logfile" 2>/dev/null || echo 0)
    if [ "$size" -gt "$MAX_EXEC_LOG_SIZE" ]; then
        for i in $(seq $((MAX_EXEC_LOG_FILES - 1)) -1 1); do
            [ -f "${logfile}.${i}" ] && mv "${logfile}.${i}" "${logfile}.$((i + 1))"
        done
        mv "$logfile" "${logfile}.1"
        : > "$logfile"
        echo "$(date '+%Y-%m-%d %H:%M') [system] Log rotated (was ${size} bytes)" >> "$logfile"
    fi
}
rotate_log "$LOG_FILE"

echo -e "${CYAN}Loki ${TP_ID} executing...${NC}"
echo "$(date '+%Y-%m-%d %H:%M') [loki] START ${TP_ID}" >> "$LOG_FILE"

START_TIME=$(date +%s)
LOG_PATH="artifacts/logs/${TP_ID}-loki.log"
: > "$LOG_PATH"

# ─── Watchdog 프로세스 ───
LOKI_PID=""
watchdog() {
    local last_size=0
    local stall_count=0

    while true; do
        sleep 10

        if [ -n "$LOKI_PID" ] && ! kill -0 "$LOKI_PID" 2>/dev/null; then
            break
        fi

        local current_size
        current_size=$(wc -c < "$LOG_PATH" 2>/dev/null || echo 0)

        if [ "$current_size" -gt "$MAX_LOG_SIZE" ]; then
            echo -e "\n${RED}[Watchdog] Log size exceeded. Force kill.${NC}"
            echo "$(date '+%Y-%m-%d %H:%M') [watchdog] LOG_OVERFLOW ${TP_ID}" >> "$LOG_FILE"
            [ -n "$LOKI_PID" ] && kill -TERM "$LOKI_PID" 2>/dev/null
            break
        fi

        if [ "$current_size" -eq "$last_size" ]; then
            stall_count=$((stall_count + 10))
            if [ "$stall_count" -ge "$STALL_TIMEOUT" ]; then
                echo -e "\n${RED}[Watchdog] No output for ${STALL_TIMEOUT}s. Stall detected. Force kill.${NC}"
                echo "$(date '+%Y-%m-%d %H:%M') [watchdog] STALL ${TP_ID} (${stall_count}s)" >> "$LOG_FILE"
                [ -n "$LOKI_PID" ] && kill -TERM "$LOKI_PID" 2>/dev/null
                break
            fi
        else
            stall_count=0
            last_size=$current_size
        fi
    done
}

watchdog &
WATCHDOG_PID=$!

cleanup() {
    kill "$WATCHDOG_PID" 2>/dev/null || true
    wait "$WATCHDOG_PID" 2>/dev/null || true
    [ -n "$LOKI_PID" ] && kill -TERM "$LOKI_PID" 2>/dev/null || true
    rm -f "artifacts/logs/.loki.pid"
    rm -rf "$LOCK_DIR"
}
trap cleanup EXIT

write_mock_rp() {
    local duration="$1"
    local image_ref="mock://loki/${TP_ID}/output.png"

    cat > "$RP_FILE" <<EOF
# ${RP_ID}: ${TP_TITLE}

## Summary
Loki mock delegation completed without a connected image API.
Placeholder image reference: ${image_ref}

## Files Changed
| Path | Action | Rationale |
|------|--------|-----------|
| artifacts/handoff/${RP_ID}.md | created | Record Loki mock execution result for ${TP_ID} |

## Commands Executed
| Command | Result | Notes |
|---------|--------|-------|
| bash scripts/delegate-loki.sh ${TP_ID} | PASS | Mock execution completed in ${duration}s |

## Acceptance Criteria Check
- [x] Loki mock execution acknowledged ${TP_ID} — PASS (evidence: script output logged to artifacts/logs/${TP_ID}-loki.log)
- [x] Saga file created with placeholder image reference — PASS (evidence: ${RP_FILE}, image ref ${image_ref})

## Known Issues
- Loki image generation is not yet connected to an external API.
- The image reference is a placeholder URI, not a real generated asset.

## Recommended Next Actions
1. Connect Loki to a real image generation backend when TP scope permits.
2. Replace the placeholder URI with a persisted file path or hosted URL after API integration.

## Context Digest
- Architecture: Loki delegation now follows the same log/lock/watchdog contract as other agents, but stops at mock execution.
- Key entry points: scripts/delegate-loki.sh writes .loki.pid, ${LOG_PATH}, and ${RP_FILE}.
- Config/env: No new packages or credentials required for the current mock path.
- Gotchas: Running the script will always create a mock RP, not a real image artifact.
EOF
}

run_loki() {
    echo "Loki image generation is not yet connected to an API. ${TP_ID} acknowledged."
    sleep 1
}

run_loki_subprocess() {
    if [ -n "$TIMEOUT_CMD" ]; then
        "$TIMEOUT_CMD" "$TIMEOUT" bash -lc 'echo "Loki image generation is not yet connected to an API. '"${TP_ID}"' acknowledged."; sleep 1'
    else
        run_loki
    fi
}

EXIT_CODE=0
run_loki_subprocess >> "$LOG_PATH" 2>&1 &
LOKI_PID=$!
echo $LOKI_PID > "artifacts/logs/.loki.pid"
wait "$LOKI_PID" || EXIT_CODE=$?
LOKI_PID=""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$EXIT_CODE" -eq 124 ]; then
    echo -e "${RED}Timeout! (${TIMEOUT}s exceeded)${NC}"
    echo "$(date '+%Y-%m-%d %H:%M') [loki] TIMEOUT ${TP_ID} (${DURATION}s)" >> "$LOG_FILE"
    exit 1
elif [ "$EXIT_CODE" -ne 0 ] && [ "$EXIT_CODE" -ne 143 ]; then
    echo -e "${RED}Error: ${TP_ID} Loki execution failed (exit: ${EXIT_CODE})${NC}"
    echo "$(date '+%Y-%m-%d %H:%M') [loki] FAILED ${TP_ID} (exit: ${EXIT_CODE}, ${DURATION}s)" >> "$LOG_FILE"
    exit 1
fi

write_mock_rp "$DURATION"

cat "$LOG_PATH"

echo -e "${GREEN}Done: ${TP_ID} (${DURATION}s)${NC}"
echo -e "${GREEN}   ${RP_FILE} created${NC}"
echo "$(date '+%Y-%m-%d %H:%M') [loki] DONE ${TP_ID} -> ${RP_ID} (${DURATION}s)" >> "$LOG_FILE"
