#!/usr/bin/env bash
# ==============================================================================
# ADC Exam Prep App — Safe Project Initialization & Session Inspector
#
# Usage:
#   Git Bash / WSL / Linux / macOS:
#     bash ./init.sh
#
#   Windows PowerShell equivalent:
#     Get-Content package.json | ConvertFrom-Json | Select-Object -ExpandProperty scripts
#     git status --short
#     npm run typecheck
# ==============================================================================

set -euo pipefail

# 1. Resolve and navigate to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure Node.js and npm are discoverable if running on Windows Git Bash
if ! command -v node &>/dev/null; then
  if [ -d "/c/Program Files/nodejs" ]; then
    export PATH="/c/Program Files/nodejs:$PATH"
  fi
fi

echo "=================================================================="
echo "  ADC Exam Prep App — Session Environment Inspector"
echo "=================================================================="
echo "Working directory: $SCRIPT_DIR"
echo ""

# 2. Check Git availability and repository state
if ! command -v git &>/dev/null; then
  echo "[-] ERROR: git is not installed or not in PATH."
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
echo "[+] Git Status:"
echo "    Active Branch : $BRANCH"
echo "    Latest Commit : $COMMIT"
echo "    Working Tree  :"
if [ -z "$(git status --porcelain)" ]; then
  echo "      Clean (no uncommitted changes)"
else
  git status --short | sed 's/^/      /'
fi
echo ""

# 3. Check Node.js and Package Manager
if ! command -v node &>/dev/null; then
  echo "[-] ERROR: Node.js is not installed or not in PATH."
  exit 1
fi

NODE_VERSION="$(node -v)"
echo "[+] Node.js Runtime : $NODE_VERSION"

if command -v npm &>/dev/null; then
  NPM_VERSION="$(npm -v)"
  echo "[+] Package Manager : npm v$NPM_VERSION"
else
  echo "[-] WARNING: npm is not available in PATH."
fi
echo ""

# 4. Check Required Project Files
echo "[+] Checking Required Workflow & Core Files:"
REQUIRED_FILES=(
  "package.json"
  "AGENTS.md"
  "features.json"
  "progress.md"
  "prisma/schema.prisma"
  ".env"
)

ALL_FILES_OK=true
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "    [OK] $f"
  else
    echo "    [MISSING] $f"
    ALL_FILES_OK=false
  fi
done
echo ""

# 5. Check Dependencies Installation
if [ -d "node_modules" ]; then
  echo "[+] Dependencies: node_modules directory exists."
  if [ -d "node_modules/.prisma/client" ]; then
    echo "    [OK] Prisma client is generated."
  else
    echo "    [WARN] Prisma client not detected. Run: npx prisma generate"
  fi
else
  echo "[-] WARNING: node_modules directory is missing."
  echo "    Action needed: Run 'npm install' to install project dependencies."
fi
echo ""

# 6. Verify Environment Configuration (Non-Destructive & Secret-Safe)
echo "[+] Checking Local Environment Configuration (.env):"
if [ -f ".env" ]; then
  ENV_KEYS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "SETTINGS_ENCRYPTION_KEY"
  )
  for key in "${ENV_KEYS[@]}"; do
    if grep -q "^[[:space:]]*${key}=" .env; then
      echo "    [CONFIGURED] $key"
    else
      echo "    [NOT SET]    $key"
    fi
  done
else
  echo "    [-] .env file not found. Copy from .env.example if available."
fi
echo ""

# 7. Display Key Available npm Scripts
echo "[+] Available Key Package Scripts:"
echo "    npm run dev       -> Start development server (Turbopack/Next.js)"
echo "    npm run typecheck -> Run TypeScript validation (tsc --noEmit)"
echo "    npm run lint      -> Run ESLint code quality checks"
echo "    npm run build     -> Production build (prisma generate && next build)"
echo "    npm run db:deploy -> Apply pending database migrations"
echo ""

# 8. Non-Destructive Health Verification
echo "[+] Running Non-Destructive Health Check:"
if [ -f "features.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('features.json', 'utf8'))" &>/dev/null; then
    echo "    [OK] features.json is valid JSON."
  else
    echo "    [-] ERROR: features.json contains invalid JSON syntax."
  fi
fi

if [ -f "prisma/schema.prisma" ]; then
  echo "    [OK] prisma/schema.prisma is present."
fi
echo ""

# 9. Print Agent Instructions & Next Steps
echo "=================================================================="
echo "  Session Ready! Agent Next Steps:"
echo "=================================================================="
echo "  1. Review AGENTS.md for mandatory rules and coding constraints."
echo "  2. Read progress.md to understand the latest project status."
echo "  3. Select exactly ONE 'ready' feature from features.json."
echo "  4. Set feature to 'in_progress' and implement minimal clean changes."
echo "  5. Verify changes with 'npm run typecheck' and relevant tests."
echo "  6. Update features.json and progress.md before ending session."
echo "=================================================================="
