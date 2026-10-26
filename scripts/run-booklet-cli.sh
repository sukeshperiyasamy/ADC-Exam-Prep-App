#!/usr/bin/env bash
# Convert one booklet chapter with Gemini (Vertex AI service account) into a
# LOCAL database. Output is DRAFT only — nothing is published.
#
# Usage (Git Bash, from the repo root):
#   bash scripts/run-booklet-cli.sh                      # defaults: eTG "Local anaesthetics", PDF pages 58-65
#   bash scripts/run-booklet-cli.sh --chapter "Dental caries" --from 120 --to 131
#   bash scripts/run-booklet-cli.sh --force              # regenerate DRAFT content
#
# Override the DB with: LOCAL_DATABASE_URL=postgresql://user:pass@127.0.0.1:55432/db bash scripts/run-booklet-cli.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# ---- settings (edit or pass flags) ----------------------------------------
SLUG="tg-oral-dental"
TITLE="Therapeutic Guidelines: Oral and Dental (eTG 2025)"
PDF="docs/books/eTG 2025.pdf"
CHAPTER="Local anaesthetics in dentistry"
FROM=58
TO=65
SEED=""
FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) SLUG="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --pdf) PDF="$2"; shift 2 ;;
    --chapter) CHAPTER="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --to) TO="$2"; shift 2 ;;
    --seed-pages) SEED="$2"; shift 2 ;;
    --force) FORCE="--force"; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

# Re-use the 7 pages the earlier pilot already transcribed (no repeat Gemini calls).
if [[ -z "$SEED" && "$FROM" == "58" && "$TO" == "65" && -f scripts/pilot/out/local-anaesthetics/pages.json ]]; then
  SEED="scripts/pilot/out/local-anaesthetics/pages.json"
fi

# ---- database: LOCAL only ----------------------------------------------------
# .env points at the Neon PRODUCTION branch, and Prisma also reads
# DATABASE_URL_UNPOOLED, so both are overridden here.
DB_URL="${LOCAL_DATABASE_URL:-postgresql://aiexams:aiexams@127.0.0.1:55432/aiexams}"
if [[ ! "$DB_URL" =~ @(localhost|127\.0\.0\.1)[:/] ]]; then
  echo "Refusing: LOCAL_DATABASE_URL must point at localhost/127.0.0.1." >&2
  exit 2
fi
export DATABASE_URL="$DB_URL"
export DATABASE_URL_UNPOOLED="$DB_URL"

# ---- Google credentials (read from .env) -------------------------------------
env_get() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-$(env_get GOOGLE_APPLICATION_CREDENTIALS)}"
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-$(env_get GOOGLE_CLOUD_PROJECT)}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-$(env_get GOOGLE_CLOUD_LOCATION)}"
export GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-global}"

# ---- preflight ----------------------------------------------------------------
fail() { echo "ERROR: $*" >&2; exit 1; }
[[ -f "$PDF" ]] || fail "PDF not found: $PDF"
[[ -n "$GOOGLE_CLOUD_PROJECT" ]] || fail "GOOGLE_CLOUD_PROJECT is not set in .env"
[[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]] || fail "Service-account key not found: ${GOOGLE_APPLICATION_CREDENTIALS:-<unset>}"
command -v npx >/dev/null || fail "Node.js/npx not found"

echo "Database : ${DB_URL%%\?*}" | sed -E 's#//[^@]*@#//***@#'
echo "Project  : $GOOGLE_CLOUD_PROJECT ($GOOGLE_CLOUD_LOCATION)"
echo "Chapter  : \"$CHAPTER\"  PDF pages $FROM-$TO  ${FORCE:+(force regenerate)}"

echo "Applying migrations to the local database..."
npx prisma migrate deploy >/dev/null

ARGS=(--slug "$SLUG" --title "$TITLE" --pdf "$PDF" --chapter "$CHAPTER" --from "$FROM" --to "$TO")
[[ -n "$SEED" ]] && ARGS+=(--seed-pages "$SEED")
[[ -n "$FORCE" ]] && ARGS+=("$FORCE")

npx tsx scripts/booklet-process.ts "${ARGS[@]}"
