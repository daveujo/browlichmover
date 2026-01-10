# Installation Guide

## Quick Start

Follow these steps to install and run the Browlich Mover browser extension.

### Step 1: Download Required Libraries

The extension requires three JavaScript libraries that must be downloaded separately:

#### 1. jQuery 3.6.0
```bash
cd extension/lib
curl -o jquery-3.6.0.min.js https://code.jquery.com/jquery-3.6.0.min.js
```
Or download manually from: https://code.jquery.com/jquery-3.6.0.min.js

#### 2. Chess.js
```bash
curl -o chess.js https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js
```
Or download from: https://github.com/jhlywa/chess.js/releases

#### 3. Stockfish Engine
Download stockfish.js from one of these sources:
- https://github.com/niklasf/stockfish.js (recommended)
- https://github.com/exoticorn/stockfish-js

Save it as `stockfish8.js` in the `extension/lib/` directory.

**Important:** The stockfish file must export a `STOCKFISH` function that creates engine instances.

### Step 2: Create Icon Files (Optional)

Create simple icon files or use placeholders:

```bash
cd extension/icons
# Create a simple 16x16 red square as placeholder
convert -size 16x16 xc:red icon16.png
convert -size 48x48 xc:red icon48.png
convert -size 128x128 xc:red icon128.png
```

Or create PNG files manually with any image editor.

### Step 3: Load Extension in Browser

#### Chrome / Edge / Brave

1. Open browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"** button

4. Navigate to and select the `extension/` directory

5. The extension should now appear in your extensions list

6. Ensure it's **enabled** (toggle switch is on)

#### Verify Installation

1. Navigate to https://lichess.org
2. Look for the UI dock at the bottom center of the page
3. If you see control buttons (Hint, Auto, Config, etc.), the extension is working!

### Step 4: Test Functionality

1. **Start a game** on Lichess (vs Computer or Play with a Friend)
2. **Toggle Auto-ON** button in the UI dock
3. The extension should start suggesting/making moves
4. Test other controls:
   - **Hint** - Shows move arrows
   - **Config** - Cycles through 7.5s/15s/30s presets
   - **Arrows** - Toggles arrow display
   - **⚡PANIC** - Enables ultra-fast mode

## Troubleshooting

### Extension not loading

- **Error: "Manifest file is missing or unreadable"**
  - Ensure you selected the `extension/` directory, not the parent directory
  - Check that `manifest.json` exists and is valid JSON

- **Error: "Could not load javascript file"**
  - Verify all library files are downloaded to `extension/lib/`
  - Check file names match exactly (case-sensitive)

### No UI appearing on Lichess

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Common issues:
   - jQuery not loaded: Download jquery-3.6.0.min.js
   - Chess.js not loaded: Download chess.js
   - Check console for specific file names

### Stockfish not working

- Ensure stockfish8.js exports a `STOCKFISH()` function
- Check browser console for initialization errors
- Try different stockfish.js source if issues persist

### Moves not executing

1. Check that **Auto is ON** (green background)
2. Ensure it's your turn in the game
3. Verify WebSocket connection (look for console logs)
4. Try refreshing the Lichess page

## Development Setup

If you want to modify the extension:

1. Make changes to files in `extension/` directory
2. Go to extensions page (`chrome://extensions/`)
3. Click **reload** button for the extension
4. Refresh Lichess page to see changes

## File Structure Reference

```
extension/
├── manifest.json                    # Extension configuration
├── README.md                        # Main documentation
├── INSTALL.md                       # This file
├── .gitignore                       # Git ignore patterns
├── background/
│   └── service-worker.js           # Background engine manager
├── content/
│   ├── websocket-interceptor.js    # WebSocket proxy
│   ├── game-state.js               # Game state tracking
│   ├── timing-calculator.js        # Human-like delays
│   ├── arrow-renderer.js           # Board arrows
│   ├── move-selector.js            # Move selection logic
│   ├── move-executor.js            # Move execution
│   ├── ui-controller.js            # UI controls
│   └── main.js                     # Main orchestrator
├── lib/
│   ├── presets.js                  # Config presets
│   ├── jquery-3.6.0.min.js         # ⚠️ Download required
│   ├── chess.js                    # ⚠️ Download required
│   └── stockfish8.js               # ⚠️ Download required
└── icons/
    ├── icon16.png                  # Optional
    ├── icon48.png                  # Optional
    └── icon128.png                 # Optional
```

## Support

For issues and questions:
- Check browser console for error messages
- Verify all required files are present
- Ensure Lichess.org DOM structure hasn't changed
- Review individual component documentation in source files

## Security Note

This extension intercepts WebSocket communication and automates gameplay on Lichess. Use responsibly and be aware of Lichess's terms of service regarding automated play.
