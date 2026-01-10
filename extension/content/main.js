// Main orchestrator script
// This file is not part of the content scripts loaded in manifest but provides
// the main game loop logic similar to the userscript's main section

(function() {
  'use strict';
  
  // Engine state
  let engineReady = false;
  let autoHint = false;
  
  // Stockfish helpers (simplified for extension - actual engine runs in background)
  function parseInfoLine(text) {
    if (!text.startsWith('info ')) return null;
    const mpv = text.match(/multipv (\d+)/);
    const cp = text.match(/score cp (-?\d+)/);
    const mate = text.match(/score mate (-?\d+)/);
    const pv = text.match(/ pv (.+)$/);
    if (!pv) return null;

    let evalCp = null, evalType = 'cp', mateVal = null;
    if (cp) {
      evalCp = parseInt(cp[1], 10);
    } else if (mate) {
      mateVal = parseInt(mate[1], 10);
      evalCp = (mateVal > 0 ? 100000 : -100000) + mateVal;
      evalType = 'mate';
    } else {
      return null;
    }

    return {
      multipv: mpv ? parseInt(mpv[1], 10) : 1,
      evalType, evalCp, mateVal,
      pv: pv[1].trim(),
      firstMove: pv[1].trim().split(' ')[0]
    };
  }
  
  // For extension, we'll communicate with background script for engine calculations
  // This is a placeholder - needs proper implementation with message passing
  function getMultiPV(fen, retryCount = 0) {
    return new Promise((resolve) => {
      // Check for panic mode bypass
      const panicMode = window.panicModeEnabled || false;
      if (panicMode) {
        console.log(`[⚡ PANIC BYPASS] Panic mode enabled - Using panic engine`);
        // Trigger panic engine calculation via background
        chrome.runtime.sendMessage({
          type: 'PANIC_CALCULATE',
          fen: fen
        });
        resolve([]);
        return;
      }
      
      // Use cached PVs if available for same position
      if (window.cachedPVs && window.cachedPVsFen === fen) {
        resolve(window.cachedPVs);
        return;
      }
      
      // For now, return empty - actual implementation needs background worker
      console.log('[Engine] MultiPV calculation requested for:', fen);
      resolve([]);
    });
  }
  
  // Main turn processing
  async function processTurn() {
    if (!autoHint) return;
    if (window.isProcessing || window.pendingMove) return;
    if (window.gameEnded) return;
    
    const cgWrap = $('.cg-wrap')[0];
    if (!cgWrap) return;
    
    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (window.game.turn() !== myCol) return;
    
    window.isProcessing = true;
    
    try {
      const fen = window.game.fen();
      const startTime = Date.now();
      
      const pvs = await getMultiPV(fen);
      const engineMs = Date.now() - startTime;
      
      if (pvs && pvs.length > 0) {
        if (window.drawArrows) window.drawArrows(pvs);
        
        const selected = window.selectBestMove ? window.selectBestMove(pvs) : pvs[0];
        if (selected && selected.move) {
          if (window.executeMoveHumanized) {
            window.executeMoveHumanized(selected.move, engineMs);
          }
        }
      }
    } catch (e) {
      console.error('[Process Turn] Error:', e);
      window.isProcessing = false;
    }
  }
  
  // Piece select mode setup
  function setupPieceSelectMode() {
    const board = $('.cg-wrap')[0];
    if (!board) return;
    
    // Placeholder - actual implementation would handle piece selection
    console.log('[Piece Select] Mode setup (placeholder)');
  }
  
  // Main initialization
  async function run() {
    console.log('[Init] Starting extension...');
    
    // Initialize engines via background
    chrome.runtime.sendMessage({ type: 'INIT_ENGINES' });
    
    // Load settings
    chrome.storage.local.get(['autorun'], (result) => {
      autoHint = result.autorun === "1" || result.autorun === true;
    });
    
    setupPieceSelectMode();
    window.syncGameState();
    
    // Initialize UI
    if (window.initializeUI) {
      window.initializeUI();
    }
    
    // Initial turn check
    const cgWrap = $('.cg-wrap')[0];
    if (cgWrap) {
      const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
      if (window.game.turn() === myCol && autoHint) {
        setTimeout(processTurn, 500);
      }
    }
    
    // Move observer
    const moveObs = new MutationObserver((muts) => {
      for (const mut of muts) {
        if (mut.addedNodes.length === 0) continue;
        if (mut.addedNodes[0].tagName === "I5Z") continue;

        const lastEl = $('l4x')[0]?.lastChild;
        if (!lastEl) continue;

        try { window.game.move(lastEl.textContent); } catch (e) {}

        // Clear caches
        window.cachedPVs = null;
        window.cachedPVsFen = null;
        window.cachedPieceCount = null;
        window.cachedFen = null;
        window.isProcessing = false;
        window.pendingMove = false;
        window.lastMoveSent = null;
        window.lastMoveSentTime = 0;
        window.pendingMoveUci = null;
        window.lastMoveAcked = false;

        setTimeout(processTurn, 100);
      }
    });

    window.waitForElement('rm6').then((el) => {
      moveObs.observe(el, { childList: true, subtree: true });
      window.syncGameState();
      setTimeout(processTurn, 500);
    }).catch(e => console.error('[Init] rm6 not found:', e));

    // End game observer
    const endObs = new MutationObserver(() => {
      if ($('div.rcontrols')[0]?.textContent.includes("Rematch")) {
        window.resetGameState();
        endObs.disconnect();
      }
    });
    
    const rcontrols = $('div.rcontrols')[0];
    if (rcontrols) {
      endObs.observe(rcontrols, { childList: true, subtree: true });
    }

    // Periodic turn check
    setInterval(() => {
      if (!window.gameEnded && !window.isProcessing && !window.pendingMoveUci && autoHint) {
        const cg = $('.cg-wrap')[0];
        if (cg) {
          const myCol = cg.classList.contains('orientation-white') ? 'w' : 'b';
          if (window.game.turn() === myCol) {
            processTurn();
          }
        }
      }
    }, 3000);

    console.log('[Init] ✅ Extension initialized');
  }
  
  // Export functions
  window.processTurn = processTurn;
  window.getMultiPV = getMultiPV;
  
  // Start when DOM is ready
  window.waitForElement('rm6').then(() => run()).catch(() => {
    // If rm6 not found, try to run anyway after delay
    setTimeout(run, 2000);
  });
})();
