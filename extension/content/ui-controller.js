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
    window.autoHint = autoHint; // Sync to window for cross-module access
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
    toggle.style.color = '#FFFFFF';
    toggle.style.border = '1px solid rgba(255, 255, 255, 0.3)';

    const retractBtn = document.createElement('button');
    retractBtn.classList.add('fbt');
    retractBtn.style.fontSize = '12px';
    retractBtn.style.padding = '2px 6px';
    retractBtn.style.minWidth = '28px';
    retractBtn.style.color = '#FFFFFF';
    retractBtn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    retractBtn.style.backgroundColor = '#2C3E50';
    retractBtn.title = 'Hide dock completely';

    const content = document.createElement('div');
    content.id = 'lf-bottom-dock-content';
    content.style.cssText = 'display: flex;align-items:center;gap: 6px;';

    bar.appendChild(toggle);
    bar.appendChild(retractBtn);
    bar.appendChild(content);
    root.appendChild(bar);
    document.body.appendChild(root);

    // Load collapsed and retracted states
    chrome.storage.local.get(['lfDockCollapsed', 'lfDockRetracted'], (result) => {
      let collapsed = result.lfDockCollapsed === true || result.lfDockCollapsed === '1';
      let retracted = result.lfDockRetracted === true || result.lfDockRetracted === '1';
      
      function render() {
        if (retracted) {
          bar.style.display = 'none';
          root.style.width = '40px';
          root.style.height = '40px';
          
          // Create restore indicator if it doesn't exist
          let restoreBtn = document.getElementById('lf-dock-restore');
          if (!restoreBtn) {
            restoreBtn = document.createElement('button');
            restoreBtn.id = 'lf-dock-restore';
            restoreBtn.classList.add('fbt');
            restoreBtn.innerText = '▶';
            restoreBtn.title = 'Show dock';
            restoreBtn.style.cssText = [
              'font-size: 14px',
              'padding: 8px',
              'background: rgba(0,0,0,0.5)',
              'color: #FFFFFF',
              'border: 1px solid rgba(255, 255, 255, 0.3)',
              'border-radius: 8px',
              'cursor: pointer'
            ].join(';');
            restoreBtn.onclick = () => {
              retracted = false;
              chrome.storage.local.set({ lfDockRetracted: false });
              render();
            };
            root.appendChild(restoreBtn);
          }
          restoreBtn.style.display = 'block';
        } else {
          bar.style.display = 'flex';
          root.style.width = '';
          root.style.height = '';
          const restoreBtn = document.getElementById('lf-dock-restore');
          if (restoreBtn) restoreBtn.style.display = 'none';
          
          content.style.display = collapsed ? 'none' : 'flex';
          toggle.textContent = collapsed ? '▲' : '▼';
          toggle.title = collapsed ? 'Expand' : 'Minimize';
          retractBtn.textContent = '◀';
        }
        chrome.storage.local.set({ lfDockCollapsed: collapsed, lfDockRetracted: retracted });
      }
      
      toggle.onclick = () => { 
        collapsed = !collapsed; 
        render(); 
      };
      
      retractBtn.onclick = () => {
        retracted = true;
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
    hintBtn.style.color = "#FFFFFF";
    hintBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
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
    autoBtn.style.backgroundColor = autoHint ? "#27AE60" : "#34495E";
    autoBtn.style.color = "#FFFFFF";
    autoBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    autoBtn.onclick = () => {
      autoHint = !autoHint;
      window.autoHint = autoHint; // Sync to window for cross-module access
      chrome.storage.local.set({ autorun: autoHint ? "1" : "0" });
      autoBtn.innerText = autoHint ? 'Auto-ON' : 'Auto-OFF';
      autoBtn.style.backgroundColor = autoHint ? "#27AE60" : "#34495E";
      if (autoHint && window.processTurn) { 
        window.isProcessing = false; 
        window.processTurn(); 
      }
    };
    btnCont.appendChild(autoBtn);

    // 3. Config Toggle
    const CFG_ORDER = [
      '7.5s', '15s', '30s', '45s', 
      '1:00', '1:30', '2:00', '2:30', '3:00',
      '3:45', '4:30', '5:00',
      '6:00', '7:00', '8:00', '9:00', '10:00',
      '11:00', '12:00', '13:00', '14:00', '15:00',
      '16:00', '17:00', '18:00', '19:00', '20:00',
      '21:00', '22:00', '23:00', '24:00', '25:00'
    ];
    const CFG_COLORS = { 
      '7.5s': "#8E44AD", '15s': "#A93226", '30s': "#229954", '45s': "#E67E22",
      '1:00': "#3498DB", '1:30': "#1ABC9C", '2:00': "#9B59B6", '2:30': "#34495E", '3:00': "#16A085",
      '3:45': "#27AE60", '4:30': "#2980B9", '5:00': "#8E44AD",
      '6:00': "#2C3E50", '7:00': "#F39C12", '8:00': "#D35400", '9:00': "#C0392B", '10:00': "#BDC3C7",
      '11:00': "#7F8C8D", '12:00': "#95A5A6", '13:00': "#AAB7B8", '14:00': "#839192", '15:00': "#717D7E",
      '16:00': "#616A6B", '17:00': "#515A5A", '18:00': "#424949", '19:00': "#2E4053", '20:00': "#273746",
      '21:00': "#212F3C", '22:00': "#1B2631", '23:00': "#17202A", '24:00': "#1C2833", '25:00': "#154360"
    };

    const configBtn = document.createElement('button');
    configBtn.innerText = `Cfg: ${configMode}`;
    configBtn.classList.add('fbt');
    configBtn.style.backgroundColor = CFG_COLORS[configMode] || "#229954";
    configBtn.style.fontSize = "10px";
    configBtn.style.color = "#FFFFFF";
    configBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
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
    arrowBtn.style.backgroundColor = showArrows ? "#3498DB" : "#34495E";
    arrowBtn.style.color = "#FFFFFF";
    arrowBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    arrowBtn.onclick = () => {
      showArrows = !showArrows;
      chrome.storage.local.set({ showArrows: showArrows });
      if (window.updateShowArrows) window.updateShowArrows(showArrows);
      arrowBtn.innerText = showArrows ? 'Arr-ON' : 'Arr-OFF';
      arrowBtn.style.backgroundColor = showArrows ? "#3498DB" : "#34495E";
    };
    btnCont.appendChild(arrowBtn);

    // 5. Piece Mode
    const pieceBtn = document.createElement('button');
    pieceBtn.innerText = pieceSelectMode ? 'Piece-ON' : 'Piece-OFF';
    pieceBtn.classList.add('fbt');
    pieceBtn.style.fontSize = "9px";
    pieceBtn.style.backgroundColor = pieceSelectMode ? "#2980B9" : "#34495E";
    pieceBtn.style.color = "#FFFFFF";
    pieceBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    pieceBtn.onclick = () => {
      pieceSelectMode = !pieceSelectMode;
      chrome.storage.local.set({ pieceSelectMode: pieceSelectMode });
      pieceBtn.innerText = pieceSelectMode ? 'Piece-ON' : 'Piece-OFF';
      pieceBtn.style.backgroundColor = pieceSelectMode ? "#2980B9" : "#34495E";
    };
    btnCont.appendChild(pieceBtn);

    // 6. Human Mode
    const humanBtn = document.createElement('button');
    humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
    humanBtn.classList.add('fbt');
    humanBtn.style.fontSize = "9px";
    humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "#34495E";
    humanBtn.style.color = "#FFFFFF";
    humanBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    humanBtn.onclick = () => {
      humanMode = !humanMode;
      chrome.storage.local.set({ humanMode: humanMode });
      humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
      humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "#34495E";
      if (humanMode && window.resetStats) window.resetStats();
    };
    btnCont.appendChild(humanBtn);

    // 7. Vary Mode
    const varyBtn = document.createElement('button');
    varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
    varyBtn.classList.add('fbt');
    varyBtn.style.fontSize = "9px";
    varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "#34495E";
    varyBtn.style.color = "#FFFFFF";
    varyBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    varyBtn.onclick = () => {
      variedMode = !variedMode;
      chrome.storage.local.set({ variedMode: variedMode });
      varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
      varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "#34495E";
    };
    btnCont.appendChild(varyBtn);

    // 8. PANIC MODE BUTTON
    const panicBtn = document.createElement('button');
    panicBtn.innerText = panicModeEnabled ? '⚡PANIC-ON' : '⚡PANIC';
    panicBtn.classList.add('fbt');
    panicBtn.style.fontSize = "9px";
    panicBtn.style.backgroundColor = panicModeEnabled ? "#E74C3C" : "#34495E";
    panicBtn.style.color = "#FFFFFF";
    panicBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    panicBtn.style.fontWeight = "bold";
    panicBtn.title = "Enable instant moves using fast panic engine (depth 1)";
    panicBtn.onclick = () => {
      panicModeEnabled = !panicModeEnabled;
      chrome.storage.local.set({ panicMode: panicModeEnabled });
      panicBtn.innerText = panicModeEnabled ? '⚡PANIC-ON' : '⚡PANIC';
      panicBtn.style.backgroundColor = panicModeEnabled ? "#E74C3C" : "#34495E";
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
      lagBtn.style.backgroundColor = vpnPingOffset > 0 ? "#1ABC9C" : "#34495E";
      lagBtn.title = [
        `Server avg: ${avgLag}ms`,
        `VPN offset: +${vpnPingOffset}ms`,
        `Normal claim: ${normalClaim}ms`,
        `Panic claim: ${panicClaim}ms`
      ].join('\n');
    };
    lagBtn.classList.add('fbt');
    lagBtn.style.fontSize = "9px";
    lagBtn.style.color = "#FFFFFF";
    lagBtn.style.border = "1px solid rgba(255, 255, 255, 0.3)";
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
