// Arrow Renderer - Lines 1014-1064 from userscript
// Draws move arrows on the chess board

(function() {
  'use strict';
  
  const PV_COLORS = [
    { name: 'pv1', hex: '#15781B' },
    { name: 'pv2', hex: '#D35400' },
    { name: 'pv3', hex: '#2980B9' },
    { name: 'pv4', hex: '#8E44AD' }
  ];
  
  let showArrows = true;
  
  // Load settings
  chrome.storage.local.get(['showArrows'], (result) => {
    showArrows = result.showArrows !== false;
  });
  
  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.showArrows) {
      showArrows = changes.showArrows.newValue !== false;
      if (!showArrows) {
        clearArrows();
      }
    }
  });
  
  function ensureMarkers() {
    const defs = $('svg.cg-shapes defs')[0];
    if (!defs) return;
    
    for (const { name, hex } of PV_COLORS) {
      if (!document.getElementById(`arrowhead-${name}`)) {
        defs.innerHTML += `<marker id="arrowhead-${name}" orient="auto" markerWidth="4" markerHeight="8" refX="2.05" refY="2"><path d="M0,0 V4 L3,2 Z" fill="${hex}"></path></marker>`;
      }
    }
  }
  
  function getArrowCoords(sq, color) {
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(sq[1]) - 1;
    
    let x, y;
    if (color === 'white') {
      x = file + 0.5;
      y = 8 - rank - 0.5;
    } else {
      x = 7 - file + 0.5;
      y = rank + 0.5;
    }
    
    return [x, y];
  }
  
  function drawArrows(pvs) {
    if (!showArrows || !pvs || !pvs.length) return;
    
    ensureMarkers();
    const layer = $('svg.cg-shapes g')[0];
    if (!layer) return;
    
    layer.innerHTML = '';

    const seen = new Set();
    const col = $('.cg-wrap')[0]?.classList.contains('orientation-white') ? 'white' : 'black';
    const topEval = pvs[0]?.evalCp || 0;

    pvs.slice(0, 4).forEach((pv, i) => {
      const m = pv.firstMove;
      if (!m || seen.has(m)) return;
      seen.add(m);

      const pal = PV_COLORS[i];
      const [x1, y1] = getArrowCoords(m.substring(0, 2), col);
      const [x2, y2] = getArrowCoords(m.substring(2, 4), col);

      layer.innerHTML += `<line stroke="${pal.hex}" stroke-width="${0.22 - i*0.015}" stroke-linecap="round" marker-end="url(#arrowhead-${pal.name})" opacity="${1 - i*0.1}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;

      const cp = pv.evalCp || 0;
      const cpLoss = topEval - cp;
      let label = pv.evalType === 'mate'
        ? `${pv.mateVal > 0 ? '+' : ''}M${pv.mateVal}`
        : `${cp >= 0 ? '+' : ''}${(cp/100).toFixed(1)}`;
      if (i > 0 && cpLoss > 0) label += ` (-${(cpLoss/100).toFixed(1)})`;

      const w = label.length * 0.13 + 0.5;
      layer.innerHTML += `<rect x="${x2 - w/2}" y="${y2 - 0.4}" width="${w}" height="0.34" rx="0.06" fill="#FFF" opacity="0.9" stroke="${pal.hex}" stroke-width="0.02"></rect>`;
      layer.innerHTML += `<text x="${x2}" y="${y2 - 0.18}" fill="${pal.hex}" text-anchor="middle" font-size="0.24" font-weight="bold">${label}</text>`;
    });
  }
  
  function clearArrows() {
    const layer = $('svg.cg-shapes g')[0];
    if (layer) {
      layer.innerHTML = '';
    }
  }
  
  // Export functions globally
  window.drawArrows = drawArrows;
  window.clearArrows = clearArrows;
  window.updateShowArrows = (value) => {
    showArrows = value;
    chrome.storage.local.set({ showArrows: value });
    if (!value) clearArrows();
  };
  
  console.log('[Arrow Renderer] ✅ Initialized');
})();
