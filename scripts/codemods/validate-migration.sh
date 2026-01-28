#!/bin/bash

# Validate React → SolidJS migration
# Checks for remaining React patterns that need manual attention

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Validation Report${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to search and report
check_pattern() {
  local pattern=$1
  local description=$2
  local severity=$3  # "error" or "warning"

  local count=$(grep -r "$pattern" "$SRC_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)

  if [[ $count -gt 0 ]]; then
    if [[ "$severity" == "error" ]]; then
      echo -e "${RED}✗ ISSUE: ${description}${NC}"
      ((ERRORS++))
    else
      echo -e "${YELLOW}⚠ WARNING: ${description}${NC}"
      ((WARNINGS++))
    fi
    echo "  Found $count occurrences"
    echo "  Files:"
    grep -r "$pattern" "$SRC_DIR" --include="*.tsx" --include="*.ts" -l 2>/dev/null | head -5 | while read file; do
      echo "    - ${file#$PROJECT_ROOT/}"
    done
    if [[ $count -gt 5 ]]; then
      echo "    ... and $((count - 5)) more"
    fi
    echo ""
  else
    echo -e "${GREEN}✓ OK: No ${description}${NC}"
  fi
}

echo -e "${BLUE}Checking for React remnants...${NC}"
echo ""

# Critical - must be fixed
check_pattern "from 'react'" "React imports" "error"
check_pattern "from \"react\"" "React imports (double quotes)" "error"
check_pattern "from 'react-dom'" "ReactDOM imports" "error"
check_pattern "useState" "useState hooks (should be createSignal)" "error"
check_pattern "useEffect" "useEffect hooks (should be createEffect/onMount)" "error"
check_pattern "useCallback" "useCallback hooks (usually not needed in Solid)" "warning"
check_pattern "useMemo" "useMemo hooks (should be createMemo)" "error"
check_pattern "useRef" "useRef hooks (refs work differently in Solid)" "warning"

echo ""
echo -e "${BLUE}Checking JSX patterns...${NC}"
echo ""

check_pattern "className=" "className attributes (should be class)" "error"
check_pattern "htmlFor=" "htmlFor attributes (should be for)" "error"
check_pattern "dangerouslySetInnerHTML" "dangerouslySetInnerHTML (should be innerHTML)" "warning"

echo ""
echo -e "${BLUE}Checking for React-specific patterns...${NC}"
echo ""

check_pattern "React\." "React namespace usage" "error"
check_pattern "\.map(" "Array.map (consider using <For>)" "warning"
check_pattern "&&.*<" "Conditional rendering with && (consider <Show>)" "warning"
check_pattern "\? .*<.*: null" "Ternary for rendering (consider <Show>)" "warning"

echo ""
echo -e "${BLUE}Checking library imports...${NC}"
echo ""

check_pattern "from 'framer-motion'" "Framer Motion imports (should be @motionone/solid)" "error"
check_pattern "from 'lucide-react'" "lucide-react imports (should be lucide-solid)" "error"
check_pattern "@radix-ui/react" "Radix UI imports (should be @kobalte/core)" "error"
check_pattern "from 'zustand'" "Zustand imports (should use solid-js/store)" "error"

echo ""
echo -e "${BLUE}Checking store patterns...${NC}"
echo ""

check_pattern "useStore\(" "useStore hook (review for Solid store pattern)" "warning"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo -e "${GREEN}✓ All checks passed! Migration looks complete.${NC}"
elif [[ $ERRORS -eq 0 ]]; then
  echo -e "${YELLOW}⚠ Found $WARNINGS warnings. Review recommended but may be OK.${NC}"
else
  echo -e "${RED}✗ Found $ERRORS errors and $WARNINGS warnings.${NC}"
  echo -e "${RED}Please fix the errors before proceeding.${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Fix any errors reported above"
echo "2. Review warnings (some may be intentional)"
echo "3. Run: bun run dev"
echo "4. Test the application manually"
echo ""

# Exit with error code if there are errors
if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi

exit 0
