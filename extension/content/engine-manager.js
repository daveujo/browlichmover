// Engine Manager - runs in content script context
// Normal Engine: stockfish.js (Web Worker pattern)
// Panic Engine: stockfish8.js (window.STOCKFISH pattern)

let normalEngine = null;      // The stockfish Web Worker
let panicEngine = null;       // The STOCKFISH() instance
let engineReady = false;
let panicEngineReady = false;

// State tracking
let panicEngineCalculating = false;
let panicLastRequestTime = 0;
let panicLastFenRequested = null;
let panicBestMove = null;
const PANIC_TIMEOUT_MS = 500;
const PANIC_MAX_RETRIES = 3;
let panicEngineRetryCount = 0;

// MultiPV results storage
let currentPVs = new Map();
let pendingResolve = null;

// Initialize Normal Engine (stockfish.js creates global `stockfish` worker)
function initializeNormalEngine() {
  return new Promise((resolve) => {
    // stockfish.js creates window.stockfish as a Worker
    if (typeof stockfish !== 'undefined' && stockfish instanceof Worker) {
      normalEngine = stockfish;
      
      normalEngine.onmessage = (e) => {
        const data = String(e.data || e);
        
        if (data === 'readyok') {
          engineReady = true;
          console.log('[Normal Engine] ✅ Ready!');
        }
        
        // Parse info lines for MultiPV
        if (data.startsWith('info ') && pendingResolve) {
          const parsed = parseInfoLine(data);
          if (parsed && parsed.firstMove) {
            currentPVs.set(parsed.multipv, parsed);
          }
        }
        
        // Best move signals calculation complete
        if (data.startsWith('bestmove') && pendingResolve) {
          const pvArray = [...currentPVs.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => v);
          
          window.cachedPVs = pvArray;
          window.cachedPVsFen = window._currentCalculatingFen;
          
          pendingResolve(pvArray);
          pendingResolve = null;
          currentPVs.clear();
        }
      };
      
      // Configure engine
      normalEngine.postMessage('uci');
      normalEngine.postMessage('setoption name Threads value 1');
      normalEngine.postMessage('setoption name Contempt value 20');
      normalEngine.postMessage('setoption name MultiPV value 4');
      normalEngine.postMessage('isready');
      
      const checkReady = setInterval(() => {
        if (engineReady) {
          clearInterval(checkReady);
          resolve();
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(checkReady);
        engineReady = true;
        resolve();
      }, 3000);
    } else {
      console.error('[Normal Engine] stockfish worker not found');
      resolve();
    }
  });
}

// Initialize Panic Engine (stockfish8.js provides window.STOCKFISH)
function initializePanicEngine() {
  if (panicEngine) return;
  
  try {
    if (typeof window.STOCKFISH !== 'function') {
      console.error('[Panic Engine] window.STOCKFISH not available');
      return;
    }
    
    panicEngine = window.STOCKFISH();
    
    panicEngine.postMessage("uci");
    panicEngine.postMessage("setoption name Skill Level value 0");
    panicEngine.postMessage("setoption name MultiPV value 1");
    panicEngine.postMessage("setoption name Hash value 16");
    
    panicEngine.onmessage = function(event) {
      const data = typeof event === 'string' ? event : (event.data || '');
      
      if (data.includes && data.includes("bestmove")) {
        panicBestMove = data.split(" ")[1];
        panicEngineCalculating = false;
        panicEngineRetryCount = 0;
        
        // Execute panic move if conditions are met
        if (window.panicModeEnabled && panicBestMove && !window.gameEnded && !window.pendingMoveUci) {
          if (window.webSocketWrapper && window.webSocketWrapper.readyState === 1) {
            const lagClaim = window.getPanicLagCompensation ? window.getPanicLagCompensation() : 100;
            console.log(`[⚡ PANIC ENGINE] Sending: ${panicBestMove} | Lag: ${lagClaim}ms`);
            
            window.webSocketWrapper.send(JSON.stringify({
              t: "move",
              d: { u: panicBestMove, a: window.currentAck || 0, b: 1, l: lagClaim }
            }));
            
            window.pendingMove = false;
            window.isProcessing = false;
          }
        }
      }
    };
    
    panicEngineReady = true;
    console.log('[Panic Engine] ✅ Initialized (Skill Level 0)');
  } catch (e) {
    console.error('[Panic Engine] ❌ Failed:', e);
    panicEngineReady = false;
  }
}

// Parse Stockfish info line
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

// Get MultiPV analysis (normal engine)
function getMultiPV(fen, retryCount = 0) {
  return new Promise((resolve) => {
    // Panic mode bypass
    if (window.panicModeEnabled) {
      console.log(`[⚡ PANIC BYPASS] Using panic engine`);
      panicCalculateMove(fen);
      resolve([]);
      return;
    }
    
    // Cache check
    if (window.cachedPVs && window.cachedPVsFen === fen) {
      resolve(window.cachedPVs);
      return;
    }
    
    if (!normalEngine || !engineReady) {
      if (retryCount < 3) {
        setTimeout(() => getMultiPV(fen, retryCount + 1).then(resolve), 100);
      } else {
        resolve([]);
      }
      return;
    }
    
    // Get engine time from active config
    const engineTime = window.activeEngineMs || 20;
    
    currentPVs.clear();
    window._currentCalculatingFen = fen;
    pendingResolve = resolve;
    
    // Timeout fallback
    setTimeout(() => {
      if (pendingResolve === resolve) {
        const pvArray = [...currentPVs.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v);
        pendingResolve(pvArray);
        pendingResolve = null;
        currentPVs.clear();
      }
    }, 2000);
    
    normalEngine.postMessage('stop');
    normalEngine.postMessage('position fen ' + fen);
    normalEngine.postMessage(`go movetime ${engineTime}`);
  });
}

// Panic engine calculation
function panicCalculateMove(fen) {
  if (panicEngineCalculating) {
    const elapsed = Date.now() - panicLastRequestTime;
    if (elapsed < PANIC_TIMEOUT_MS) {
      console.log(`[⚡ PANIC] Engine busy (${elapsed}ms)`);
      return;
    }
    panicEngineCalculating = false;
  }
  
  if (fen === panicLastFenRequested && panicBestMove) {
    // Use cached move
    if (window.panicModeEnabled && !window.gameEnded && !window.pendingMoveUci) {
      if (window.webSocketWrapper?.readyState === 1) {
        const lagClaim = window.getPanicLagCompensation ? window.getPanicLagCompensation() : 100;
        window.webSocketWrapper.send(JSON.stringify({
          t: "move",
          d: { u: panicBestMove, a: window.currentAck || 0, b: 1, l: lagClaim }
        }));
        window.pendingMove = false;
        window.isProcessing = false;
      }
    }
    return;
  }
  
  if (!panicEngine || !panicEngineReady) {
    initializePanicEngine();
    if (!panicEngineReady) {
      setTimeout(() => panicCalculateMove(fen), 50);
      return;
    }
  }
  
  panicEngineCalculating = true;
  panicLastRequestTime = Date.now();
  panicLastFenRequested = fen;
  panicBestMove = null;
  
  try {
    panicEngine.postMessage("stop");
    panicEngine.postMessage("position fen " + fen);
    panicEngine.postMessage("go depth 1");
    console.log(`[⚡ PANIC] Calculating...`);
  } catch (e) {
    console.error('[⚡ PANIC] Error:', e);
    panicEngineCalculating = false;
  }
}

// Reinitialize panic engine if stuck
function reinitializePanicEngine() {
  panicEngine = null;
  panicEngineReady = false;
  panicEngineCalculating = false;
  panicEngineRetryCount = 0;
  initializePanicEngine();
}

// Export to window
window.initializeNormalEngine = initializeNormalEngine;
window.initializePanicEngine = initializePanicEngine;
window.getMultiPV = getMultiPV;
window.panicCalculateMove = panicCalculateMove;
window.reinitializePanicEngine = reinitializePanicEngine;

console.log('[Engine Manager] ✅ Loaded');
