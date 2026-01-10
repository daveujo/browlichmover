// WebSocket Interceptor - Lines 308-441 from userscript
// Handles WebSocket proxy for Lichess game communication

(function() {
  'use strict';
  
  // State variables
  let webSocketWrapper = null;
  let currentAck = 0;
  let lastWebSocketState = null;
  
  // Game state tracking
  window.gameEnded = false;
  window.lastMoveAcked = false;
  window.pendingMoveUci = null;
  window.reconnectRetryScheduled = false;
  
  // VPN/Network Lag Compensation
  let vpnPingOffset = 0;
  let serverLagHistory = [50, 50, 50];
  const MAX_LAG_HISTORY = 5;
  
  // Load settings from chrome.storage
  chrome.storage.local.get(['vpnPingOffset'], (result) => {
    vpnPingOffset = result.vpnPingOffset || 0;
  });
  
  function updateServerLag(clockData) {
    if (clockData && typeof clockData.lag === 'number') {
      const lagMs = clockData.lag * 10;
      serverLagHistory.push(lagMs);
      if (serverLagHistory.length > MAX_LAG_HISTORY) {
        serverLagHistory.shift();
      }
      console.log(`[Lag] Server: ${lagMs}ms | History: [${serverLagHistory.join(', ')}]`);
    }
  }
  
  function getAverageServerLag() {
    const sum = serverLagHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / serverLagHistory.length);
  }
  
  function getLagCompensation() {
    const avgServerLag = getAverageServerLag();
    const totalLag = avgServerLag + vpnPingOffset;
    const maxReasonable = Math.max(avgServerLag * 2, 100);
    return Math.min(totalLag, maxReasonable);
  }
  
  function getPanicLagCompensation() {
    const avgServerLag = getAverageServerLag();
    const totalLag = avgServerLag + vpnPingOffset + 30;
    const maxReasonable = Math.max(avgServerLag * 3, 200);
    return Math.min(totalLag, maxReasonable);
  }
  
  // Export lag functions globally
  window.getLagCompensation = getLagCompensation;
  window.getPanicLagCompensation = getPanicLagCompensation;
  window.getAverageServerLag = getAverageServerLag;
  window.updateVpnPingOffset = (offset) => {
    vpnPingOffset = offset;
    chrome.storage.local.set({ vpnPingOffset: offset });
  };
  
  function scheduleReconnectRetry() {
    if (window.reconnectRetryScheduled) return;
    window.reconnectRetryScheduled = true;

    const checkReconnect = setInterval(() => {
      if (webSocketWrapper && webSocketWrapper.readyState === 1) {
        clearInterval(checkReconnect);
        window.reconnectRetryScheduled = false;
        console.log(`[⚡ PANIC] 🔄 WebSocket reconnected, retrying...`);

        // Dispatch custom event for reconnection
        window.dispatchEvent(new CustomEvent('websocket-reconnected'));
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkReconnect);
      window.reconnectRetryScheduled = false;
    }, 10000);
  }
  
  // WebSocket Proxy
  const webSocketProxy = new Proxy(window.WebSocket, {
    construct: function(target, args) {
      let ws = new target(...args);
      webSocketWrapper = ws;
      window.webSocketWrapper = ws; // Export globally

      // Wrap send to prevent duplicate moves
      const originalSend = ws.send.bind(ws);
      ws.send = function(data) {
        try {
          const msg = JSON.parse(data);
          if (msg.t === 'move' && msg.d && msg.d.u) {
            // Block if game ended
            if (window.gameEnded) {
              console.log(`[Send] ❌ Blocked (game ended): ${msg.d.u}`);
              return;
            }
            // Block duplicate of pending move
            if (window.pendingMoveUci === msg.d.u && !window.lastMoveAcked) {
              console.log(`[Send] ❌ Blocked (duplicate pending): ${msg.d.u}`);
              return;
            }
            // Track this move
            window.pendingMoveUci = msg.d.u;
            window.lastMoveAcked = false;
            console.log(`[Send] ✅ ${msg.d.u} | a: ${msg.d.a} | l: ${msg.d.l}ms`);
          }
        } catch (e) {}
        return originalSend(data);
      };

      // Track WebSocket state changes
      ws.addEventListener("open", function() {
        console.log('[WebSocket] ✅ Connected');
        lastWebSocketState = 1;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('websocket-opened'));
      });

      ws.addEventListener("close", function() {
        console.log('[WebSocket] ❌ Disconnected');
        lastWebSocketState = 3;
      });

      ws.addEventListener("error", function() {
        console.log('[WebSocket] ⚠️ Error');
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('websocket-error'));
      });

      ws.addEventListener("message", function(event) {
        try {
          let msg = JSON.parse(event.data);

          // Track ACK - move was accepted
          if (msg.t === 'ack') {
            window.lastMoveAcked = true;
            console.log(`[ACK] Move accepted: ${window.pendingMoveUci}`);
            window.pendingMoveUci = null;
          }

          // Track game end
          if (msg.t === 'endData' || (msg.d && msg.d.status && msg.d.winner)) {
            window.gameEnded = true;
            console.log(`[Game] Ended - blocking further moves`);
            window.dispatchEvent(new CustomEvent('game-ended'));
          }

          // Track move confirmations
          if (msg.t === 'move' && msg.d) {
            if (typeof msg.d.ply !== 'undefined') {
              currentAck = msg.d.ply;
              window.currentAck = currentAck; // Export globally
            }

            // Update lag tracking from server response
            if (msg.d.clock) {
              updateServerLag(msg.d.clock);
            }

            // Check for game end in move response
            if (msg.d.status || msg.d.winner) {
              window.gameEnded = true;
              window.dispatchEvent(new CustomEvent('game-ended'));
            }

            // Clear pending after our move is confirmed
            if (msg.d.uci === window.pendingMoveUci) {
              window.pendingMoveUci = null;
            }
            
            // Dispatch move event
            window.dispatchEvent(new CustomEvent('lichess-move', { detail: msg }));
          }

          // Intercept FEN for panic engine
          if (!window.gameEnded && msg.d && typeof msg.d.fen === "string" && typeof msg.v === "number") {
            window.dispatchEvent(new CustomEvent('lichess-fen', { detail: msg }));
          }

          // Handle reload/reconnect messages
          if (msg.t === 'reload' || msg.t === 'resync') {
            console.log(`[WebSocket] 🔄 ${msg.t} received`);
            window.dispatchEvent(new CustomEvent('websocket-reconnected'));
          }
        } catch (e) {}
      });
      
      return ws;
    }
  });
  
  window.WebSocket = webSocketProxy;
  window.currentAck = currentAck;
  
  // Try to capture existing WebSocket from Lichess
  function captureExistingWebSocket() {
    // Method 1: Check lichess global
    if (window.lichess?.socket?.ws) {
      webSocketWrapper = window.lichess.socket.ws;
      window.webSocketWrapper = webSocketWrapper;
      console.log('[WebSocket] ✅ Captured existing Lichess socket');
      return true;
    }
    
    // Method 2: Find WebSocket in window properties
    for (const key in window) {
      try {
        if (window[key] instanceof WebSocket && window[key].readyState === 1) {
          webSocketWrapper = window[key];
          window.webSocketWrapper = webSocketWrapper;
          console.log('[WebSocket] ✅ Found existing WebSocket');
          return true;
        }
      } catch (e) {}
    }
    return false;
  }
  
  // Retry capturing existing socket
  let captureAttempts = 0;
  const captureInterval = setInterval(() => {
    if (window.webSocketWrapper && window.webSocketWrapper.readyState === 1) {
      clearInterval(captureInterval);
      return;
    }
    if (captureExistingWebSocket()) {
      clearInterval(captureInterval);
    }
    if (++captureAttempts > 50) { // 5 seconds
      clearInterval(captureInterval);
    }
  }, 100);
  
  console.log('[WebSocket Interceptor] ✅ Initialized');
})();
