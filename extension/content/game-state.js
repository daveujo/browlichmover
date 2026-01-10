// Game State Management - Lines 1245-1254 and related state tracking
// Syncs the chess game state from the Lichess UI

(function() {
  'use strict';
  
  // Initialize game state
  window.lichess = window.site;
  window.game = new Chess();
  
  // Game state variables
  window.isProcessing = false;
  window.pendingMove = false;
  window.lastMoveSent = null;
  window.lastMoveSentTime = 0;
  
  // Cache variables
  window.cachedPVs = null;
  window.cachedPVsFen = null;
  window.cachedPieceCount = null;
  window.cachedFen = null;
  
  // Statistics
  window.humanTimingStats = { totalMoves: 0, totalTimeMs: 0, engineTimeMs: 0 };
  window.varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
  window.gameBlunderCount = 0;
  
  // Sync game state from DOM
  function syncGameState() {
    try {
      window.game = new Chess();
      const moves = $('kwdb, u8t');
      for (let i = 0; i < moves.length; i++) {
        const moveText = moves[i].textContent.replace('✓', '').trim();
        if (moveText) {
          try { 
            window.game.move(moveText); 
          } catch(e) {}
        }
      }
    } catch(e) {
      console.error('[Game State] Sync error:', e);
    }
  }
  
  // Reset game state for new game
  function resetGameState() {
    window.gameEnded = false;
    window.lastMoveAcked = false;
    window.pendingMoveUci = null;
    window.pendingMove = false;
    window.isProcessing = false;
    window.lastMoveSent = null;
    window.lastMoveSentTime = 0;
    window.cachedPVs = null;
    window.cachedPVsFen = null;
    window.cachedPieceCount = null;
    window.cachedFen = null;
    window.humanTimingStats = { totalMoves: 0, totalTimeMs: 0, engineTimeMs: 0 };
    window.varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
    window.gameBlunderCount = 0;
    console.log('[State] Game state reset');
  }
  
  // Helper: Count pieces on board
  function countPieces() {
    if (window.cachedPieceCount !== null && window.cachedFen === window.game.fen()) {
      return window.cachedPieceCount;
    }
    const fen = window.game.fen();
    const pieces = fen.split(' ')[0];
    const count = pieces.replace(/[^a-zA-Z]/g, '').length;
    window.cachedPieceCount = count;
    window.cachedFen = fen;
    return count;
  }
  
  // Helper: Get clock seconds
  function getClockSeconds() {
    try {
      const cgWrap = $('.cg-wrap')[0];
      if (!cgWrap) return 999;
      
      const myCol = cgWrap.classList.contains('orientation-white') ? 'white' : 'black';
      const clockEl = $(`.rclock.rclock-${myCol} .time`)[0];
      if (!clockEl) return 999;
      
      const txt = clockEl.textContent.trim();
      const parts = txt.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 999;
    } catch (e) {
      return 999;
    }
  }
  
  // Export functions globally
  window.syncGameState = syncGameState;
  window.resetGameState = resetGameState;
  window.countPieces = countPieces;
  window.getClockSeconds = getClockSeconds;
  
  // Listen for game events
  window.addEventListener('game-ended', resetGameState);
  
  // Wait for element helper
  window.waitForElement = function(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const el = $(selector)[0];
        if (el) {
          clearInterval(checkInterval);
          resolve(el);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }
      }, 100);
    });
  };
  
  console.log('[Game State] ✅ Initialized');
})();
