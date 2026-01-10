// Timing Calculator - Lines 809-881 from userscript
// Calculates human-like timing delays for moves

(function() {
  'use strict';
  
  // Active configuration (loaded from settings)
  let activeHuman = null;
  let humanMode = false;
  let panicModeEnabled = false;
  
  // Load settings
  chrome.storage.local.get(['configMode', 'humanMode', 'panicMode'], (result) => {
    const configMode = result.configMode || '15s';
    humanMode = result.humanMode !== false;
    panicModeEnabled = result.panicMode === true;
    
    if (window.PRESETS && window.PRESETS[configMode]) {
      activeHuman = window.PRESETS[configMode].human;
    }
  });
  
  // Listen for config changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.configMode && window.PRESETS) {
        const newMode = changes.configMode.newValue;
        if (window.PRESETS[newMode]) {
          activeHuman = window.PRESETS[newMode].human;
        }
      }
      if (changes.humanMode) {
        humanMode = changes.humanMode.newValue !== false;
      }
      if (changes.panicMode) {
        panicModeEnabled = changes.panicMode.newValue === true;
      }
    }
  });
  
  // Calculate human-like delay for a move
  function calculateHumanDelay(uci) {
    if (!activeHuman) {
      // Fallback to default 15s config
      activeHuman = window.PRESETS['15s'].human;
    }
    
    const cfg = activeHuman;
    const clockSecs = window.getClockSeconds ? window.getClockSeconds() : 999;

    // PANIC MODE - instant moves
    if (panicModeEnabled) {
      return 0;
    }

    // CAPTURES - always instant
    if (uci && uci.length >= 4) {
      const targetSquare = uci.substring(2, 4);
      const targetPiece = window.game.get(targetSquare);
      if (targetPiece) {
        return 0;
      }
    }

    const pc = window.countPieces ? window.countPieces() : 32;

    // Premove mode
    if (pc <= cfg.premovePieceThreshold) {
      const delay = cfg.premoveDelayMs + Math.random() * (cfg.premoveMaxMs - cfg.premoveDelayMs);
      return Math.max(0, Math.round(delay));
    }

    // Low piece mode
    if (pc <= cfg.lowPieceThreshold) {
      const delay = cfg.lowPieceDelayMs + Math.random() * (cfg.lowPieceMaxMs - cfg.lowPieceDelayMs);
      return Math.max(0, Math.round(delay));
    }

    // Normal mode
    let delay = cfg.baseDelayMs;
    delay *= (1 + (Math.random() * 2 - 1) * cfg.randomVariance);

    const roll = Math.random();
    if (roll < cfg.quickMoveChance) {
      delay = cfg.quickMoveMs + Math.random() * 50;
    } else if (roll < cfg.quickMoveChance + cfg.tankChance) {
      delay = cfg.tankMinMs + Math.random() * (cfg.tankMaxMs - cfg.tankMinMs);
    }

    delay = Math.max(0, Math.min(delay, cfg.maxDelayMs));

    if (window.humanTimingStats && window.humanTimingStats.totalMoves > 5) {
      const avg = (window.humanTimingStats.totalTimeMs + window.humanTimingStats.engineTimeMs) / window.humanTimingStats.totalMoves;
      if (avg > 580) {
        delay *= Math.max(0.5, 580 / avg);
      }
    }

    return Math.round(delay);
  }
  
  function updateTimingStats(delayMs, engineMs = 0) {
    if (window.humanTimingStats) {
      window.humanTimingStats.totalMoves++;
      window.humanTimingStats.totalTimeMs += delayMs;
      window.humanTimingStats.engineTimeMs += engineMs;
    }
  }
  
  function resetStats() {
    window.humanTimingStats = { totalMoves: 0, totalTimeMs: 0, engineTimeMs: 0 };
    window.varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
    window.gameBlunderCount = 0;
    window.cachedPieceCount = null;
    window.cachedFen = null;
    window.cachedPVsFen = null;
    window.pendingMove = false;
    window.isProcessing = false;
    window.lastMoveSent = null;
    window.lastMoveSentTime = 0;
    console.log('[Stats] Reset');
  }
  
  // Export functions globally
  window.calculateHumanDelay = calculateHumanDelay;
  window.updateTimingStats = updateTimingStats;
  window.resetStats = resetStats;
  
  console.log('[Timing Calculator] ✅ Initialized');
})();
