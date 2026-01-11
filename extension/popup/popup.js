// Popup script for Browlich Mover extension
(function() {
  'use strict';
  
  const autoToggle = document.getElementById('autoToggle');
  const autoStatus = document.getElementById('autoStatus');
  const currentPreset = document.getElementById('currentPreset');
  const presetSelect = document.getElementById('presetSelect');
  
  // Load current settings
  function loadSettings() {
    chrome.storage.local.get(['autorun', 'configMode'], (result) => {
      const autoEnabled = result.autorun === "1" || result.autorun === true;
      const preset = result.configMode || '15s';
      
      // Update auto toggle
      if (autoEnabled) {
        autoToggle.classList.add('active');
        autoStatus.textContent = 'Auto move is ON';
      } else {
        autoToggle.classList.remove('active');
        autoStatus.textContent = 'Auto move is OFF';
      }
      
      // Update preset display
      currentPreset.textContent = preset;
      presetSelect.value = preset;
    });
  }
  
  // Toggle auto move
  autoToggle.addEventListener('click', () => {
    chrome.storage.local.get(['autorun'], (result) => {
      const currentState = result.autorun === "1" || result.autorun === true;
      const newState = !currentState;
      
      chrome.storage.local.set({ autorun: newState ? "1" : "0" }, () => {
        if (newState) {
          autoToggle.classList.add('active');
          autoStatus.textContent = 'Auto move is ON';
        } else {
          autoToggle.classList.remove('active');
          autoStatus.textContent = 'Auto move is OFF';
        }
        
        // Notify content script about the change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('lichess.org')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'autorun-changed',
              value: newState
            }).catch((error) => {
              // Expected error: Could not establish connection when content script is not injected yet
              console.log('Content script not ready:', error.message);
            });
          }
        });
      });
    });
  });
  
  // Change preset
  presetSelect.addEventListener('change', (e) => {
    const newPreset = e.target.value;
    chrome.storage.local.set({ configMode: newPreset }, () => {
      currentPreset.textContent = newPreset;
      
      // Notify content script about the change
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('lichess.org')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'preset-changed',
            value: newPreset
          }).catch((error) => {
            // Expected error: Could not establish connection when content script is not injected yet
            console.log('Content script not ready:', error.message);
          });
        }
      });
    });
  });
  
  // Initialize on load
  loadSettings();
  
  // Listen for storage changes from other parts of extension
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.autorun) {
        const autoEnabled = changes.autorun.newValue === "1" || changes.autorun.newValue === true;
        if (autoEnabled) {
          autoToggle.classList.add('active');
          autoStatus.textContent = 'Auto move is ON';
        } else {
          autoToggle.classList.remove('active');
          autoStatus.textContent = 'Auto move is OFF';
        }
      }
      
      if (changes.configMode) {
        const preset = changes.configMode.newValue;
        currentPreset.textContent = preset;
        presetSelect.value = preset;
      }
    }
  });
})();
