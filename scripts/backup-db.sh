#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with: brew install libpq" >&2
  echo 'Then add to PATH: export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Run via: npm run db:backup" >&2
  exit 1
fi

# pg_dump needs a direct Neon endpoint, not the pooler.
DUMP_URL="${DATABASE_URL//-pooler/}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d)"
OUT_FILE="$BACKUP_DIR/thrust-$STAMP.dump"
LOG_FILE="$BACKUP_DIR/backup.log"

{
  echo "[$STAMP $(date +%H:%M:%S)] Starting backup"
  pg_dump "$DUMP_URL" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$OUT_FILE"
  echo "[$STAMP $(date +%H:%M:%S)] Wrote $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
  find "$BACKUP_DIR" -name 'thrust-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete
  echo "[$STAMP $(date +%H:%M:%S)] Pruned backups older than ${RETENTION_DAYS} days"
} >>"$LOG_FILE" 2>&1

echo "Backup complete: $OUT_FILE"
