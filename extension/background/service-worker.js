// Background Service Worker - Engine Manager
// Combines Stockfish Engine (Lines 887-1011) and Panic Engine (Lines 87-301)

// Import stockfish - this will be loaded from web_accessible_resources
let stockfish = null;
let panicEngine = null;

// Engine state
let engineReady = false;
let panicEngineReady = false;

// Panic engine state tracking
let panicEngineCalculating = false;
let panicLastRequestTime = 0;
let panicLastFenRequested = null;
let panicWatchdogTimer = null;
let panicEngineRetryCount = 0;
const PANIC_TIMEOUT_MS = 500;
const PANIC_MAX_RETRIES = 3;

// Stockfish configuration
const SF_THREADS = 4;
const sfListeners = new Set();

// Initialize Stockfish Engine
async function initializeStockfish() {
  try {
    // In service worker context, we need to load stockfish differently
    // This is a placeholder - actual implementation depends on how stockfish is bundled
    console.log('[Engine] Initializing Stockfish...');
    
    // Configure stockfish when available
    if (typeof STOCKFISH === 'function') {
      stockfish = STOCKFISH();
      
      stockfish.onmessage = (e) => {
        const data = String(e.data || '');
        if (data === 'readyok') {
          engineReady = true;
          console.log('[Engine] ✅ Ready!');
        }
        
        // Broadcast to all listeners
        for (const fn of sfListeners) {
          try { fn(e); } catch(x) {}
        }
        
        // Send to content script if needed
        chrome.runtime.sendMessage({
          type: 'ENGINE_MESSAGE',
          data: e.data
        }).catch(() => {});
      };
      
      await configureEngine();
    }
  } catch (e) {
    console.error('[Engine] Failed to initialize:', e);
  }
}

function configureEngine() {
  return new Promise((resolve) => {
    console.log('[Engine] Configuring...');
    stockfish.postMessage('uci');
    stockfish.postMessage('setoption name Threads value 1');
    stockfish.postMessage('setoption name Contempt value 20');
    stockfish.postMessage(`setoption name MultiPV value ${SF_THREADS}`);
    stockfish.postMessage('isready');

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
  });
}

// Initialize Panic Engine
function initializePanicEngine() {
  if (panicEngine) return;

  try {
    if (typeof STOCKFISH !== 'function') {
      console.error('[Panic Engine] STOCKFISH not available');
      return;
    }
    
    panicEngine = STOCKFISH();

    // Configure for skill level 0
    panicEngine.postMessage("uci");
    panicEngine.postMessage("setoption name Skill Level value 0");
    panicEngine.postMessage("setoption name MultiPV value 1");
    panicEngine.postMessage("setoption name Hash value 16");

    panicEngine.onmessage = function(event) {
      if (event && typeof event === 'string' && event.includes("bestmove")) {
        const panicBestMove = event.split(" ")[1];
        panicEngineCalculating = false;
        panicEngineRetryCount = 0;

        if (panicWatchdogTimer) {
          clearTimeout(panicWatchdogTimer);
          panicWatchdogTimer = null;
        }

        // Send move to content script
        chrome.runtime.sendMessage({
          type: 'PANIC_MOVE',
          move: panicBestMove
        }).catch(() => {});
      }
    };
    
    panicEngineReady = true;
    console.log('[Panic Engine] ✅ Initialized (Skill Level 0)');
  } catch (e) {
    console.error('[Panic Engine] ❌ Failed to initialize:', e);
    panicEngineReady = false;
  }
}

function reinitializePanicEngine() {
  console.log('[Panic Engine] 🔄 Reinitializing...');
  panicEngine = null;
  panicEngineReady = false;
  panicEngineCalculating = false;
  panicEngineRetryCount = 0;
  initializePanicEngine();
}

function handlePanicTimeout() {
  console.log(`[⚡ PANIC] ⚠️ Engine timeout after ${PANIC_TIMEOUT_MS}ms`);
  panicEngineCalculating = false;
  panicEngineRetryCount++;

  if (panicEngineRetryCount >= PANIC_MAX_RETRIES) {
    console.log(`[⚡ PANIC] ❌ Max retries (${PANIC_MAX_RETRIES}) reached, reinitializing engine`);
    reinitializePanicEngine();
    panicEngineRetryCount = 0;
  }

  chrome.runtime.sendMessage({
    type: 'PANIC_TIMEOUT'
  }).catch(() => {});
}

// Message handler from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'INIT_ENGINES':
      initializeStockfish();
      initializePanicEngine();
      sendResponse({ success: true });
      break;
      
    case 'STOCKFISH_COMMAND':
      if (stockfish) {
        stockfish.postMessage(message.command);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Stockfish not initialized' });
      }
      break;
      
    case 'PANIC_CALCULATE':
      if (!panicEngine || !panicEngineReady) {
        initializePanicEngine();
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'PANIC_RETRY',
            fen: message.fen
          });
        }, 50);
        sendResponse({ success: false, error: 'Panic engine initializing' });
        break;
      }
      
      // Guard: Don't start new calculation if engine is busy
      if (panicEngineCalculating) {
        const elapsed = Date.now() - panicLastRequestTime;
        if (elapsed < PANIC_TIMEOUT_MS) {
          sendResponse({ success: false, error: 'Engine busy' });
          break;
        } else {
          panicEngineCalculating = false;
        }
      }
      
      // Guard: Don't recalculate same position
      if (message.fen === panicLastFenRequested) {
        sendResponse({ success: false, error: 'Position already calculated' });
        break;
      }
      
      panicEngineCalculating = true;
      panicLastRequestTime = Date.now();
      panicLastFenRequested = message.fen;
      
      if (panicWatchdogTimer) {
        clearTimeout(panicWatchdogTimer);
      }
      panicWatchdogTimer = setTimeout(handlePanicTimeout, PANIC_TIMEOUT_MS);
      
      try {
        panicEngine.postMessage("stop");
        panicEngine.postMessage("position fen " + message.fen);
        panicEngine.postMessage("go depth 1");
        console.log(`[⚡ PANIC] 🔍 Calculating: ${message.fen.substring(0, 20)}...`);
        sendResponse({ success: true });
      } catch (e) {
        console.error('[⚡ PANIC] ❌ Engine error:', e);
        panicEngineCalculating = false;
        if (panicWatchdogTimer) {
          clearTimeout(panicWatchdogTimer);
          panicWatchdogTimer = null;
        }
        reinitializePanicEngine();
        sendResponse({ success: false, error: e.message });
      }
      break;
      
    case 'GET_ENGINE_STATUS':
      sendResponse({
        stockfishReady: engineReady,
        panicReady: panicEngineReady,
        panicCalculating: panicEngineCalculating
      });
      break;
  }
  
  return true; // Keep channel open for async response
});

// Initialize on service worker startup
console.log('[Background] Service worker started');
