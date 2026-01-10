#!/bin/bash
# Comprehensive Sanity Check for Extension Migration

echo "=== BROWLICH MOVER EXTENSION - SANITY CHECK ==="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# 1. Check manifest.json validity
echo "1. Checking manifest.json..."
if [ -f "manifest.json" ]; then
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Valid JSON"
    else
        echo -e "   ${RED}✗${NC} Invalid JSON syntax"
        ((errors++))
    fi
else
    echo -e "   ${RED}✗${NC} manifest.json not found"
    ((errors++))
fi

# 2. Check all content scripts exist
echo "2. Checking content scripts..."
content_scripts=(
    "content/websocket-interceptor.js"
    "content/game-state.js"
    "content/timing-calculator.js"
    "content/arrow-renderer.js"
    "content/move-selector.js"
    "content/move-executor.js"
    "content/ui-controller.js"
    "content/main.js"
)

for script in "${content_scripts[@]}"; do
    if [ -f "$script" ]; then
        echo -e "   ${GREEN}✓${NC} $script"
    else
        echo -e "   ${RED}✗${NC} $script MISSING"
        ((errors++))
    fi
done

# 3. Check background service worker
echo "3. Checking background service worker..."
if [ -f "background/service-worker.js" ]; then
    echo -e "   ${GREEN}✓${NC} background/service-worker.js"
else
    echo -e "   ${RED}✗${NC} background/service-worker.js MISSING"
    ((errors++))
fi

# 4. Check lib files
echo "4. Checking library files..."
if [ -f "lib/presets.js" ]; then
    echo -e "   ${GREEN}✓${NC} lib/presets.js (present)"
else
    echo -e "   ${RED}✗${NC} lib/presets.js MISSING"
    ((errors++))
fi

# Check for external dependencies
if [ ! -f "lib/jquery-3.6.0.min.js" ]; then
    echo -e "   ${YELLOW}⚠${NC} lib/jquery-3.6.0.min.js needs download"
    ((warnings++))
fi
if [ ! -f "lib/chess.js" ]; then
    echo -e "   ${YELLOW}⚠${NC} lib/chess.js needs download"
    ((warnings++))
fi
if [ ! -f "lib/stockfish8.js" ]; then
    echo -e "   ${YELLOW}⚠${NC} lib/stockfish8.js needs download"
    ((warnings++))
fi

# 5. Check icons
echo "5. Checking icons..."
for size in 16 48 128; do
    if [ -f "icons/icon${size}.png" ]; then
        echo -e "   ${GREEN}✓${NC} icons/icon${size}.png"
    else
        echo -e "   ${RED}✗${NC} icons/icon${size}.png MISSING"
        ((errors++))
    fi
done

# 6. Check for JavaScript syntax errors
echo "6. Checking JavaScript syntax..."
js_files=$(find . -name "*.js" -not -path "./lib/*" 2>/dev/null)
syntax_errors=0
for file in $js_files; do
    if node --check "$file" 2>/dev/null; then
        echo -e "   ${GREEN}✓${NC} $file (syntax OK)"
    else
        echo -e "   ${RED}✗${NC} $file (syntax error)"
        ((syntax_errors++))
        ((errors++))
    fi
done

# 7. Check for required exports in modules
echo "7. Checking key exports..."

# Check websocket-interceptor exports
if grep -q "window.getLagCompensation" content/websocket-interceptor.js; then
    echo -e "   ${GREEN}✓${NC} websocket-interceptor exports lag functions"
else
    echo -e "   ${RED}✗${NC} websocket-interceptor missing lag exports"
    ((errors++))
fi

# Check game-state exports
if grep -q "window.syncGameState" content/game-state.js; then
    echo -e "   ${GREEN}✓${NC} game-state exports sync functions"
else
    echo -e "   ${RED}✗${NC} game-state missing exports"
    ((errors++))
fi

# Check timing-calculator exports
if grep -q "window.calculateHumanDelay" content/timing-calculator.js; then
    echo -e "   ${GREEN}✓${NC} timing-calculator exports delay function"
else
    echo -e "   ${RED}✗${NC} timing-calculator missing exports"
    ((errors++))
fi

# Check move-executor exports
if grep -q "window.executeMove" content/move-executor.js; then
    echo -e "   ${GREEN}✓${NC} move-executor exports execute functions"
else
    echo -e "   ${RED}✗${NC} move-executor missing exports"
    ((errors++))
fi

# Check arrow-renderer exports
if grep -q "window.drawArrows" content/arrow-renderer.js; then
    echo -e "   ${GREEN}✓${NC} arrow-renderer exports draw functions"
else
    echo -e "   ${RED}✗${NC} arrow-renderer missing exports"
    ((errors++))
fi

# Check move-selector exports
if grep -q "window.selectBestMove" content/move-selector.js; then
    echo -e "   ${GREEN}✓${NC} move-selector exports selection functions"
else
    echo -e "   ${RED}✗${NC} move-selector missing exports"
    ((errors++))
fi

# Check ui-controller exports
if grep -q "window.initializeUI" content/ui-controller.js; then
    echo -e "   ${GREEN}✓${NC} ui-controller exports UI init"
else
    echo -e "   ${RED}✗${NC} ui-controller missing exports"
    ((errors++))
fi

# 8. Check documentation
echo "8. Checking documentation..."
for doc in README.md INSTALL.md MIGRATION.md MIGRATION_SUMMARY.md; do
    if [ -f "$doc" ]; then
        echo -e "   ${GREEN}✓${NC} $doc"
    else
        echo -e "   ${RED}✗${NC} $doc MISSING"
        ((errors++))
    fi
done

# 9. Check chrome.storage usage (not localStorage)
echo "9. Checking storage API usage..."
if grep -r "localStorage" content/*.js background/*.js 2>/dev/null | grep -v "// " | grep -v "\*"; then
    echo -e "   ${YELLOW}⚠${NC} Found localStorage usage (should use chrome.storage)"
    ((warnings++))
else
    echo -e "   ${GREEN}✓${NC} No localStorage usage found"
fi

# 10. Check for IIFE wrapping
echo "10. Checking IIFE wrapping..."
iife_count=$(grep -c "(function()" content/*.js background/*.js 2>/dev/null || echo 0)
if [ "$iife_count" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} Found IIFE wrappers ($iife_count files)"
else
    echo -e "   ${YELLOW}⚠${NC} No IIFE wrappers found"
    ((warnings++))
fi

# Summary
echo ""
echo "=== SUMMARY ==="
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo "Extension is ready for testing!"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo "Errors: $errors"
    echo "Warnings: $warnings (mostly external dependencies)"
    exit 0
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Errors: $errors"
    echo "Warnings: $warnings"
    exit 1
fi
