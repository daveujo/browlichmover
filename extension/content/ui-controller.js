// UI Controller - Lines 1279-1654 from userscript
// Creates and manages the extension UI

(function() {
  'use strict';
  
  // Settings state
  let autoHint = false;
  let showArrows = true;
  let pieceSelectMode = false;
  let humanMode = false;
  let variedMode = false;
  let panicModeEnabled = false;
  let configMode = '15s';
  let vpnPingOffset = 0;
  
  // Active config
  let activeEngineMs = 20;
  
  // Load all settings from chrome.storage
  chrome.storage.local.get([
    'autorun', 'showArrows', 'pieceSelectMode', 'humanMode', 
    'variedMode', 'panicMode', 'configMode', 'vpnPingOffset'
  ], (result) => {
    autoHint = result.autorun === "1" || result.autorun === true;
    showArrows = result.showArrows !== false;
    pieceSelectMode = result.pieceSelectMode === true;
    humanMode = result.humanMode !== false;
    variedMode = result.variedMode !== false;
    panicModeEnabled = result.panicMode === true;
    configMode = result.configMode || '15s';
    vpnPingOffset = result.vpnPingOffset || 0;
    
    applyConfig(configMode);
  });
  
  function applyConfig(mode) {
    configMode = mode;
    chrome.storage.local.set({ configMode: mode });
    
    if (window.PRESETS && window.PRESETS[mode]) {
      activeEngineMs = window.PRESETS[mode].engineMs;
      console.log(`[Config] Applied ${mode} preset`);
    }
  }
  
  // Create floating UI dock
  function createBottomDock() {
    const existing = document.getElementById('lf-bottom-dock-content');
    if (existing) return existing;

    const root = document.createElement('div');
    root.id = 'lf-bottom-dock';
    root.style.cssText = [
      'position: fixed',
      'left: 50%',
      'bottom: 8px',
      'transform: translateX(-50%)',
      'z-index: 999999',
      'pointer-events: none'
    ].join(';');

    const bar = document.createElement('div');
    bar.style.cssText = [
      'pointer-events: auto',
      'display: flex',
      'align-items: center',
      'gap: 6px',
      'padding: 6px 8px',
      'background: rgba(0,0,0,0.35)',
      'border-radius: 12px',
      'backdrop-filter: blur(4px)',
      'max-width: calc(100vw - 16px)',
      'overflow-x: auto'
    ].join(';');

    const toggle = document.createElement('button');
    toggle.classList.add('fbt');
    toggle.style.fontSize = '10px';
    toggle.style.padding = '2px 6px';
    toggle.style.minWidth = '28px';

    const content = document.createElement('div');
    content.id = 'lf-bottom-dock-content';
    content.style.cssText = 'display: flex;align-items:center;gap: 6px;';

    bar.appendChild(toggle);
    bar.appendChild(content);
    root.appendChild(bar);
    document.body.appendChild(root);

    // Load collapsed state
    chrome.storage.local.get(['lfDockCollapsed'], (result) => {
      let collapsed = result.lfDockCollapsed === true || result.lfDockCollapsed === '1';
      
      function render() {
        content.style.display = collapsed ? 'none' : 'flex';
        toggle.textContent = collapsed ? '▲' : '▼';
        toggle.title = collapsed ? 'Expand' : 'Minimize';
        chrome.storage.local.set({ lfDockCollapsed: collapsed });
      }
      
      toggle.onclick = () => { 
        collapsed = !collapsed; 
        render(); 
      };
      
      render();
    });

    return content;
  }
  
  // Initialize UI
  function initializeUI() {
    const btnCont = createBottomDock();
    if (!btnCont) {
      console.error('[UI] Failed to create dock');
      return;
    }

    // 1. Hint Button
    const hintBtn = document.createElement('button');
    hintBtn.innerText = 'Hint';
    hintBtn.classList.add('fbt');
    hintBtn.onclick = () => {
      if (window.getMultiPV) {
        window.getMultiPV(window.game.fen()).then(pvs => { 
          if (pvs.length) { 
            window.cachedPVs = pvs; 
            if (window.drawArrows) window.drawArrows(pvs); 
          } 
        });
      }
    };
    btnCont.appendChild(hintBtn);

    // 2. Auto Toggle
    const autoBtn = document.createElement('button');
    autoBtn.innerText = autoHint ? 'Auto-ON' : 'Auto-OFF';
    autoBtn.classList.add('fbt');
    autoBtn.style.backgroundColor = autoHint ? "green" : "";
    autoBtn.onclick = () => {
      autoHint = !autoHint;
      chrome.storage.local.set({ autorun: autoHint ? "1" : "0" });
      autoBtn.innerText = autoHint ? 'Auto-ON' : 'Auto-OFF';
      autoBtn.style.backgroundColor = autoHint ? "green" : "";
      if (autoHint && window.processTurn) { 
        window.isProcessing = false; 
        window.processTurn(); 
      }
    };
    btnCont.appendChild(autoBtn);

    // 3. Config Toggle
    const CFG_ORDER = ['7.5s', '15s', '30s'];
    const CFG_COLORS = { '7.5s': "#8E44AD", '15s': "#A93226", '30s': "#229954" };

    const configBtn = document.createElement('button');
    configBtn.innerText = `Cfg: ${configMode}`;
    configBtn.classList.add('fbt');
    configBtn.style.backgroundColor = CFG_COLORS[configMode] || "#229954";
    configBtn.style.fontSize = "10px";
    configBtn.onclick = () => {
      const idx = Math.max(0, CFG_ORDER.indexOf(configMode));
      const newMode = CFG_ORDER[(idx + 1) % CFG_ORDER.length];
      applyConfig(newMode);
      configBtn.innerText = `Cfg: ${newMode}`;
      configBtn.style.backgroundColor = CFG_COLORS[newMode] || "#229954";
    };
    btnCont.appendChild(configBtn);

    // 4. Arrow Toggle
    const arrowBtn = document.createElement('button');
    arrowBtn.innerText = showArrows ? 'Arr-ON' : 'Arr-OFF';
    arrowBtn.classList.add('fbt');
    arrowBtn.style.fontSize = "10px";
    arrowBtn.style.opacity = showArrows ? "1" : "0.5";
    arrowBtn.onclick = () => {
      showArrows = !showArrows;
      chrome.storage.local.set({ showArrows: showArrows });
      if (window.updateShowArrows) window.updateShowArrows(showArrows);
      arrowBtn.innerText = showArrows ? 'Arr-ON' : 'Arr-OFF';
      arrowBtn.style.opacity = showArrows ? "1" : "0.5";
    };
    btnCont.appendChild(arrowBtn);

    // 5. Piece Mode
    const pieceBtn = document.createElement('button');
    pieceBtn.innerText = pieceSelectMode ? 'Piece-ON' : 'Piece-OFF';
    pieceBtn.classList.add('fbt');
    pieceBtn.style.fontSize = "9px";
    pieceBtn.style.backgroundColor = pieceSelectMode ? "#2980B9" : "";
    pieceBtn.onclick = () => {
      pieceSelectMode = !pieceSelectMode;
      chrome.storage.local.set({ pieceSelectMode: pieceSelectMode });
      pieceBtn.innerText = pieceSelectMode ? 'Piece-ON' : 'Piece-OFF';
      pieceBtn.style.backgroundColor = pieceSelectMode ? "#2980B9" : "";
    };
    btnCont.appendChild(pieceBtn);

    // 6. Human Mode
    const humanBtn = document.createElement('button');
    humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
    humanBtn.classList.add('fbt');
    humanBtn.style.fontSize = "9px";
    humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "";
    humanBtn.onclick = () => {
      humanMode = !humanMode;
      chrome.storage.local.set({ humanMode: humanMode });
      humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
      humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "";
      if (humanMode && window.resetStats) window.resetStats();
    };
    btnCont.appendChild(humanBtn);

    // 7. Vary Mode
    const varyBtn = document.createElement('button');
    varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
    varyBtn.classList.add('fbt');
    varyBtn.style.fontSize = "9px";
    varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "";
    varyBtn.onclick = () => {
      variedMode = !variedMode;
      chrome.storage.local.set({ variedMode: variedMode });
      varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
      varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "";
    };
    btnCont.appendChild(varyBtn);

    // 8. PANIC MODE BUTTON
    const panicBtn = document.createElement('button');
    panicBtn.innerText = panicModeEnabled ? '⚡PANIC-ON' : '⚡PANIC';
    panicBtn.classList.add('fbt');
    panicBtn.style.fontSize = "9px";
    panicBtn.style.backgroundColor = panicModeEnabled ? "#E74C3C" : "";
    panicBtn.style.fontWeight = "bold";
    panicBtn.title = "Enable instant moves using fast panic engine (depth 1)";
    panicBtn.onclick = () => {
      panicModeEnabled = !panicModeEnabled;
      chrome.storage.local.set({ panicMode: panicModeEnabled });
      panicBtn.innerText = panicModeEnabled ? '⚡PANIC-ON' : '⚡PANIC';
      panicBtn.style.backgroundColor = panicModeEnabled ? "#E74C3C" : "";
      console.log(`[⚡ PANIC] ${panicModeEnabled ? 'ENABLED' : 'DISABLED'} via UI button`);

      if (panicModeEnabled && autoHint && window.processTurn) {
        window.isProcessing = false;
        window.pendingMove = false;
        window.processTurn();
      }
    };
    btnCont.appendChild(panicBtn);

    // 9. VPN Lag Offset Button
    const lagBtn = document.createElement('button');
    const updateLagBtnText = () => {
      const avgLag = window.getAverageServerLag ? window.getAverageServerLag() : 50;
      const normalClaim = window.getLagCompensation ? window.getLagCompensation() : 50;
      const panicClaim = window.getPanicLagCompensation ? window.getPanicLagCompensation() : 80;
      lagBtn.innerText = `+${vpnPingOffset}`;
      lagBtn.style.backgroundColor = vpnPingOffset > 0 ? "#1ABC9C" : "";
      lagBtn.title = [
        `Server avg: ${avgLag}ms`,
        `VPN offset: +${vpnPingOffset}ms`,
        `Normal claim: ${normalClaim}ms`,
        `Panic claim: ${panicClaim}ms`
      ].join('\n');
    };
    lagBtn.classList.add('fbt');
    lagBtn.style.fontSize = "9px";
    updateLagBtnText();
    lagBtn.onclick = () => {
      const offsets = [0, 30, 50, 80, 100, 150];
      const idx = offsets.indexOf(vpnPingOffset);
      vpnPingOffset = offsets[(idx + 1) % offsets.length];
      chrome.storage.local.set({ vpnPingOffset: vpnPingOffset });
      if (window.updateVpnPingOffset) window.updateVpnPingOffset(vpnPingOffset);
      updateLagBtnText();
      console.log(`[Lag] VPN: +${vpnPingOffset}ms`);
    };
    btnCont.appendChild(lagBtn);

    // Stats Display
    const stats = document.createElement('span');
    stats.id = 'human-stats';
    stats.style.cssText = 'font-size: 9px;color:#888;margin-left:5px;display:none;';
    btnCont.appendChild(stats);

    // Update stats periodically
    setInterval(() => {
      const el = document.getElementById('human-stats');
      if (!el) return;
      updateLagBtnText();
      
      if (humanMode && window.humanTimingStats && window.humanTimingStats.totalMoves > 0) {
        const avg = Math.round((window.humanTimingStats.totalTimeMs + window.humanTimingStats.engineTimeMs) / window.humanTimingStats.totalMoves);
        const tot = window.varietyStats.pv1 + window.varietyStats.pv2 + window.varietyStats.pv3 + window.varietyStats.pv4;
        const pv1p = tot > 0 ? Math.round(window.varietyStats.pv1 / tot * 100) : 0;
        el.textContent = variedMode
          ? `${avg}ms|${configMode}|PV1: ${pv1p}%|⚠️${window.gameBlunderCount}${panicModeEnabled ? '|⚡' : ''}`
          : `${avg}ms|${configMode}${panicModeEnabled ? '|⚡' : ''}`;
        el.style.display = 'inline';
      } else {
        el.style.display = 'none';
      }
    }, 1000);

    // Button visual feedback
    $('.fbt').on('mousedown', function() {
      this.style.border = '6px solid blue';
      setTimeout((a) => { a.style.border = ''; }, 500, this);
    });

    // Keyboard shortcuts
    $(document).on("keydown", (e) => {
      if (e.key === "w") { hintBtn.click(); autoBtn.click(); }
      if (e.key === "p") pieceBtn.click();
      if (e.key === "h") humanBtn.click();
      if (e.key === "v") varyBtn.click();
      if (e.key === "l") lagBtn.click();
    });

    console.log('[UI Controller] ✅ Initialized');
  }
  
  // Export initialization function
  window.initializeUI = initializeUI;
  window.getAutoHint = () => autoHint;
  window.getActiveEngineMs = () => activeEngineMs;
})();
