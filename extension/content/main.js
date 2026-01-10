// Main orchestrator script
// This file is not part of the content scripts loaded in manifest but provides
// the main game loop logic similar to the userscript's main section

(function() {
  'use strict';
  
  // Engine state
  let autoHint = false;
  
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
      
      const pvs = await window.getMultiPV(fen);
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
    
    // Initialize engines
    if (window.initializeNormalEngine) {
      await window.initializeNormalEngine();
    }
    if (window.initializePanicEngine) {
      window.initializePanicEngine();
    }
    
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
  
  // Start when DOM is ready
  window.waitForElement('rm6').then(() => run()).catch(() => {
    // If rm6 not found, try to run anyway after delay
    setTimeout(run, 2000);
  });
})();
