// Move Selector - Lines 689-807 from userscript
// Implements varied move selection with blunder logic

(function() {
  'use strict';
  
  let activeVaried = null;
  let variedMode = false;
  
  // Load settings
  chrome.storage.local.get(['configMode', 'variedMode'], (result) => {
    const configMode = result.configMode || '15s';
    variedMode = result.variedMode !== false;
    
    if (window.PRESETS && window.PRESETS[configMode]) {
      activeVaried = window.PRESETS[configMode].varied;
    }
  });
  
  // Listen for config changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.configMode && window.PRESETS) {
        const newMode = changes.configMode.newValue;
        if (window.PRESETS[newMode]) {
          activeVaried = window.PRESETS[newMode].varied;
        }
      }
      if (changes.variedMode) {
        variedMode = changes.variedMode.newValue !== false;
      }
    }
  });
  
  function selectVariedMove(pvs) {
    if (!pvs || pvs.length === 0) return null;
    if (!activeVaried) {
      activeVaried = window.PRESETS['15s'].varied;
    }

    const valid = [];
    const pgn = window.game.pgn();

    // OPTIMIZED DRAW CHECK
    try {
      const tempGame = new Chess();
      tempGame.load_pgn(pgn);

      for (let i = 0; i < pvs.length && i < 4; i++) {
        if (!pvs[i]?.firstMove) continue;

        const uci = pvs[i].firstMove;

        // Try move with "Always Queen" promotion
        const moveResult = tempGame.move({
          from: uci.substring(0, 2),
          to: uci.substring(2, 4),
          promotion: 'q'
        });

        // If move is valid (legal), check for draw
        if (moveResult) {
          const isDraw = tempGame.in_threefold_repetition() || tempGame.in_draw();

          // Undo immediately to reset for next loop iteration
          tempGame.undo();

          if (isDraw) {
            console.log(`[Anti-Draw] 🚫 Skipping ${uci} (leads to draw/repetition)`);
            continue;
          }

          valid.push({ ...pvs[i], idx: i });
        }
      }
    } catch (e) {
      console.error("[Anti-Draw] Safety fallback triggered:", e);
      // If checking fails, allow all moves to prevent freeze
      for (let i = 0; i < pvs.length && i < 4; i++) {
        if (pvs[i]) valid.push({ ...pvs[i], idx: i });
      }
    }

    // If ALL moves were draws (forced draw), we must play one
    if (valid.length === 0) {
      console.log('[Anti-Draw] ⚠️ Forced draw detected. Playing best available.');
      for (let i = 0; i < pvs.length && i < 4; i++) {
        if (pvs[i]) valid.push({ ...pvs[i], idx: i });
      }
    }

    if (valid.length === 0) return null;

    const cfg = activeVaried;
    const topEval = valid[0].evalCp || 0;

    // Blunder Logic
    let allowBlunder = false;
    if (window.gameBlunderCount < cfg.maxBlundersPerGame && topEval > -100 && Math.random() < cfg.blunderChance) {
      allowBlunder = true;
      console.log('[Vary] 🎲 Blunder allowed!');
    }

    const candidates = [];

    for (const pv of valid) {
      const cpLoss = topEval - (pv.evalCp || 0);
      const isBlunder = cpLoss >= cfg.blunderThreshold;

      // Safety: Don't blunder into immediate mate (Mate in 1, 2, or 3)
      if (pv.evalType === 'mate' && pv.mateVal !== null && pv.mateVal < 0 && pv.mateVal >= -3) continue;

      if (cpLoss > cfg.maxCpLoss) {
        if (!allowBlunder) continue;
      }

      let weight = cfg.weights[pv.idx] || 5;
      if (cfg.maxCpLoss < 1000) weight = weight - (cpLoss * 0.1);
      weight = Math.max(weight, 3);

      candidates.push({ ...pv, weight, cpLoss, isBlunder });
    }

    // Final Selection
    if (candidates.length === 0) {
      window.varietyStats.pv1++;
      return { ...valid[0], move: valid[0].firstMove };
    }

    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = candidates[0];

    for (const c of candidates) {
      rand -= c.weight;
      if (rand <= 0) { 
        selected = c; 
        break; 
      }
    }

    // Stats
    if (selected.idx === 0) window.varietyStats.pv1++;
    else if (selected.idx === 1) window.varietyStats.pv2++;
    else if (selected.idx === 2) window.varietyStats.pv3++;
    else window.varietyStats.pv4++;

    if (selected.isBlunder) {
      window.gameBlunderCount++;
      window.varietyStats.blunders++;
      console.log(`[Vary] ⚠️ BLUNDER! (${window.gameBlunderCount}/${cfg.maxBlundersPerGame})`);
    }

    return { ...selected, move: selected.firstMove };
  }
  
  function selectBestMove(pvs) {
    if (!pvs || pvs.length === 0) return null;

    let result = null;
    if (variedMode) {
      result = selectVariedMove(pvs);
    }

    if (!result || !result.move) {
      if (pvs[0] && pvs[0].firstMove) {
        result = { ...pvs[0], move: pvs[0].firstMove };
      }
    }

    return result;
  }
  
  // Export functions globally
  window.selectVariedMove = selectVariedMove;
  window.selectBestMove = selectBestMove;
  
  console.log('[Move Selector] ✅ Initialized');
})();
