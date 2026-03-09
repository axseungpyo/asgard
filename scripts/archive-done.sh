#!/bin/bash
# scripts/archive-done.sh — done 상태 태스크를 Completed로 아카이빙
#
# Usage: bash scripts/archive-done.sh [TP-NNN]
#   인자 없이 실행하면 모든 done 태스크를 아카이빙
#   TP-NNN 지정 시 해당 태스크만 아카이빙

set -euo pipefail

INDEX="artifacts/INDEX.md"
ARCHIVE_DIR="artifacts/archive"
HANDOFF_DIR="artifacts/handoff"
DATE=$(date '+%Y-%m-%d')

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ ! -f "$INDEX" ]; then
    echo -e "${RED}Error: $INDEX not found${NC}"
    exit 1
fi

mkdir -p "$ARCHIVE_DIR"

TARGET_TP="${1:-}"
ARCHIVED=0

# Parse INDEX.md for done tasks
while IFS= read -r line; do
    # Match table rows with "done" status
    if echo "$line" | grep -qE '^\|.*\|.*\|.*\| *done *\|'; then
        # Extract ID (first column)
        TP_ID=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$2); print $2}')

        # If target specified, skip non-matching
        if [ -n "$TARGET_TP" ] && [ "$TP_ID" != "$TARGET_TP" ]; then
            continue
        fi

        RP_ID="${TP_ID/TP/RP}"
        TITLE=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')
        AGENT=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$4); print $4}')

        # Copy to archive
        [ -f "$HANDOFF_DIR/${TP_ID}.md" ] && cp "$HANDOFF_DIR/${TP_ID}.md" "$ARCHIVE_DIR/"
        [ -f "$HANDOFF_DIR/${RP_ID}.md" ] && cp "$HANDOFF_DIR/${RP_ID}.md" "$ARCHIVE_DIR/"

        echo -e "${GREEN}Archived: ${TP_ID} — ${TITLE}${NC}"
        ARCHIVED=$((ARCHIVED + 1))
    fi
done < "$INDEX"

if [ "$ARCHIVED" -eq 0 ]; then
    if [ -n "$TARGET_TP" ]; then
        echo -e "${CYAN}No done task found for ${TARGET_TP}${NC}"
    else
        echo -e "${CYAN}No done tasks to archive${NC}"
    fi
    exit 0
fi

# Update INDEX.md: move done rows from Active to Completed
# Use a temporary file for atomic update
TMPFILE=$(mktemp)
IN_ACTIVE=false
IN_COMPLETED=false
COMPLETED_ROWS=""

while IFS= read -r line; do
    # Detect Completed Tasks section
    if echo "$line" | grep -q "^## Completed Tasks"; then
        IN_ACTIVE=false
        IN_COMPLETED=true
        echo "$line" >> "$TMPFILE"
        continue
    fi

    # In Completed section: insert collected rows after separator
    if [ "$IN_COMPLETED" = "true" ] && echo "$line" | grep -qE '^\|[-| ]+\|$'; then
        echo "$line" >> "$TMPFILE"
        if [ -n "$COMPLETED_ROWS" ]; then
            printf "%s" "$COMPLETED_ROWS" >> "$TMPFILE"
        fi
        IN_COMPLETED=false
        continue
    fi

    # Detect Active Tasks table header
    if echo "$line" | grep -qE '^\| *ID'; then
        IN_ACTIVE=true
        echo "$line" >> "$TMPFILE"
        continue
    fi

    # Skip separator lines
    if echo "$line" | grep -qE '^\|[-| ]+\|$'; then
        echo "$line" >> "$TMPFILE"
        continue
    fi

    # In Active table: skip done rows, collect for Completed
    if [ "$IN_ACTIVE" = "true" ] && echo "$line" | grep -qE '^\|.*\|.*\|.*\| *done *\|'; then
        TP_ID=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$2); print $2}')
        TITLE=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')
        AGENT=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$4); print $4}')

        if [ -n "$TARGET_TP" ] && [ "$TP_ID" != "$TARGET_TP" ]; then
            echo "$line" >> "$TMPFILE"
        else
            COMPLETED_ROWS="${COMPLETED_ROWS}| ${TP_ID} | ${TITLE} | ${AGENT} | ${DATE} |
"
        fi
        continue
    fi

    echo "$line" >> "$TMPFILE"
done < "$INDEX"

mv "$TMPFILE" "$INDEX"

echo -e "${CYAN}Archived ${ARCHIVED} task(s). INDEX.md updated.${NC}"
