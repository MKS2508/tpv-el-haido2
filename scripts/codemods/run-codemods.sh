#!/bin/bash

# Run all codemods for React → SolidJS migration
# Usage: ./scripts/codemods/run-codemods.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN="--dry"
  echo -e "${YELLOW}Running in dry-run mode - no files will be modified${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}React → SolidJS Migration Codemods${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if jscodeshift is available
if ! command -v npx &> /dev/null; then
  echo -e "${RED}Error: npx not found. Please install Node.js${NC}"
  exit 1
fi

# Function to run a codemod
run_codemod() {
  local name=$1
  local file=$2

  echo -e "${YELLOW}Running: ${name}${NC}"

  npx jscodeshift \
    --parser=tsx \
    --extensions=tsx,ts \
    $DRY_RUN \
    -t "$SCRIPT_DIR/$file" \
    "$SRC_DIR"

  echo -e "${GREEN}✓ Completed: ${name}${NC}"
  echo ""
}

# Run codemods in order (order matters!)
echo -e "${BLUE}Step 1/4: Transforming imports${NC}"
run_codemod "React imports → Solid" "react-imports-to-solid.ts"

echo -e "${BLUE}Step 2/4: Transforming useState${NC}"
run_codemod "useState → createSignal" "useState-to-createSignal.ts"

echo -e "${BLUE}Step 3/4: Transforming useEffect${NC}"
run_codemod "useEffect → createEffect" "useEffect-to-createEffect.ts"

echo -e "${BLUE}Step 4/4: Transforming JSX attributes${NC}"
run_codemod "className → class" "className-to-class.ts"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Codemod transformation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes manually"
echo "2. Run: ./scripts/codemods/validate-migration.sh"
echo "3. Fix any remaining issues"
echo "4. Run: bun run dev"
echo ""
echo -e "${YELLOW}Common manual fixes needed:${NC}"
echo "- .map() → <For each={}>"
echo "- Conditional rendering → <Show when={}>"
echo "- ref handling (refs work differently in Solid)"
echo "- Store integration (Zustand → solid-js/store)"
echo "- Animation (framer-motion → @motionone/solid)"
