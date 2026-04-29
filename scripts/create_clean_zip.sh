#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_PARENT="$(dirname "$PROJECT_ROOT")"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"
DATE_STAMP="$(date +%Y%m%d)"
OUTPUT_FILE="$PROJECT_ROOT/${PROJECT_NAME}-clean-${DATE_STAMP}.zip"

if ! command -v zip >/dev/null 2>&1; then
    echo "Error: zip command not found. Please install zip and try again."
    exit 1
fi

if [ -e "$OUTPUT_FILE" ]; then
    echo "Error: output file already exists:"
    echo "$OUTPUT_FILE"
    echo "Please move or delete it before creating a new archive."
    exit 1
fi

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

cd "$PROJECT_PARENT"

find "$PROJECT_NAME" \
    \( -path "$PROJECT_NAME/.git" \
        -o -path "$PROJECT_NAME/.venv" \
        -o -name "__pycache__" \) -type d -prune -o \
    \( -name ".DS_Store" \
        -o -path "$PROJECT_NAME/backend/data/*.db" \
        -o -path "$PROJECT_NAME/backend/data/*.db-*" \
        -o -path "$PROJECT_NAME/miniprogram/project.private.config.json" \
        -o -path "$PROJECT_NAME/${PROJECT_NAME}-clean-*.zip" \
        -o -name ".env" \
        -o \( -name ".env.*" ! -name ".env.example" \) \
        -o -name "*.local" \
        -o -name "*.local.*" \
        -o -name "local.*" \
        -o -name "local_config.*" \
        -o -name "private_config.*" \
        -o -name "*.private.config.json" \
        -o \( -iname "*secret*" ! -iname "*example*" \) \
        -o \( -iname "*token*" ! -iname "*example*" \) \
        -o \( -iname "*credential*" ! -iname "*example*" \) \) -prune -o \
    -type f -print | sort > "$TMP_FILE"

zip -q "$OUTPUT_FILE" -@ < "$TMP_FILE"

echo "Created clean archive:"
echo "$OUTPUT_FILE"
echo
echo "Check contents with:"
echo "unzip -l \"$OUTPUT_FILE\""
