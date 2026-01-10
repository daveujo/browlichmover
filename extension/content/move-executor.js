// Move Executor - Lines 1067-1140 from userscript
// Executes moves on the board with timing

(function() {
  'use strict';
  
  let panicModeEnabled = false;
  
  // Load settings
  chrome.storage.local.get(['panicMode'], (result) => {
    panicModeEnabled = result.panicMode === true;
  });
  
  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.panicMode) {
      panicModeEnabled = changes.panicMode.newValue === true;
    }
  });
  
  function executeMove(uci) {
    // Guards
    if (!uci) return false;
    if (window.gameEnded) {
      console.log(`[Exec] ❌ Game ended`);
      return false;
    }
    if (window.pendingMoveUci) {
      console.log(`[Exec] ❌ Move pending: ${window.pendingMoveUci}`);
      return false;
    }
    if (!window.webSocketWrapper || window.webSocketWrapper.readyState !== 1) {
      console.log(`[Exec] ⚠️ WebSocket not ready, scheduling retry`);
      // Trigger reconnect retry if available
      window.dispatchEvent(new CustomEvent('websocket-not-ready'));
      return false;
    }

    const cgWrap = $('.cg-wrap')[0];
    if (!cgWrap) return false;

    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (window.game.turn() !== myCol) return false;

    const now = Date.now();

    // Duplicate check
    if (uci === window.lastMoveSent && (now - window.lastMoveSentTime) < 500) {
      console.log(`[Exec] ❌ Duplicate blocked: ${uci}`);
      return false;
    }

    window.lastMoveSent = uci;
    window.lastMoveSentTime = now;

    // Smart lag compensation
    const lagClaim = panicModeEnabled ? 
      window.getPanicLagCompensation() : 
      window.getLagCompensation();

    console.log(`[Exec] ✅ Sending: ${uci} | Lag: ${lagClaim}ms (server avg: ${window.getAverageServerLag()}ms)${panicModeEnabled ? ' [PANIC]' : ''}`);
    
    window.webSocketWrapper.send(JSON.stringify({ 
      t: "move", 
      d: { 
        u: uci, 
        a: window.currentAck, 
        b: panicModeEnabled ? 1 : 0, 
        l: lagClaim 
      } 
    }));
    
    window.pendingMove = false;
    window.isProcessing = false;
    return true;
  }

  function executeMoveHumanized(uci, engineMs = 0) {
    if (!uci) { 
      window.isProcessing = false; 
      return; 
    }

    // PANIC MODE - direct execute
    if (panicModeEnabled) {
      console.log(`[⚡ PANIC MODE] ${uci} - using direct execute`);
      executeMove(uci);
      return;
    }

    // Instant capture
    if (uci.length >= 4) {
      const targetSquare = uci.substring(2, 4);
      const targetPiece = window.game.get(targetSquare);
      if (targetPiece) {
        const clockSecs = window.getClockSeconds ? window.getClockSeconds() : 999;
        console.log(`[⚡ CAPTURE] ${uci} | Clock: ${clockSecs.toFixed(1)}s | Engine: ${engineMs}ms`);
        executeMove(uci);
        return;
      }
    }

    const delay = window.calculateHumanDelay ? window.calculateHumanDelay(uci) : 0;
    const clockSecs = window.getClockSeconds ? window.getClockSeconds() : 999;
    
    if (window.updateTimingStats) {
      window.updateTimingStats(delay, engineMs);
    }
    
    console.log(`[Human] ${uci} | Clock: ${clockSecs.toFixed(1)}s | Delay: ${delay}ms | Engine: ${engineMs}ms`);

    if (delay <= 0) {
      executeMove(uci);
    } else {
      setTimeout(() => executeMove(uci), delay);
    }
  }
  
  // Export functions globally
  window.executeMove = executeMove;
  window.executeMoveHumanized = executeMoveHumanized;
  
  console.log('[Move Executor] ✅ Initialized');
})();
