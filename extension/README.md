# Browlich Mover - Browser Extension

Chess automation browser extension for Lichess.org with speed optimization and smart lag compensation.

## Migration from Userscript

This extension is a migration of the original userscript into a structured browser extension architecture. The migration maintains all features while improving organization and maintainability.

### Architecture

```
extension/
├── manifest.json                 # Extension manifest (Chrome/Edge compatible)
├── background/
│   └── service-worker.js        # Engine Manager (Stockfish + Panic Engine)
├── content/
│   ├── websocket-interceptor.js # WebSocket proxy for Lichess communication
│   ├── game-state.js            # Game state synchronization
│   ├── timing-calculator.js     # Human-like timing delays
│   ├── arrow-renderer.js        # Board arrow visualization
│   ├── move-selector.js         # Varied move selection logic
│   ├── move-executor.js         # Move execution with lag compensation
│   ├── ui-controller.js         # UI dock and controls
│   └── main.js                  # Main orchestrator
└── lib/
    ├── presets.js               # Configuration presets
    ├── jquery-3.6.0.min.js      # jQuery library (required)
    ├── chess.js                 # Chess.js library (required)
    └── stockfish8.js            # Stockfish engine (required)
```

## Feature Mapping

| Feature                | Userscript Lines | Extension Component              | Status |
|------------------------|------------------|----------------------------------|--------|
| WebSocket Proxy        | 308-441          | content/websocket-interceptor.js | ✅      |
| Stockfish Engine       | 887-1011         | background/service-worker.js     | ✅      |
| Panic Engine           | 87-301           | background/service-worker.js     | ✅      |
| Game State Sync        | 1245-1254        | content/game-state.js            | ✅      |
| Move Execution         | 1067-1140        | content/move-executor.js         | ✅      |
| Human Timing           | 809-881          | content/timing-calculator.js     | ✅      |
| Arrow Drawing          | 1014-1064        | content/arrow-renderer.js        | ✅      |
| Varied Move Selection  | 689-807          | content/move-selector.js         | ✅      |
| UI Dock                | 1279-1654        | content/ui-controller.js         | ✅      |
| Settings Persistence   | localStorage     | chrome.storage.local             | ✅      |
| Config Presets         | 457-536          | lib/presets.js                   | ✅      |

## Installation

### Required Dependencies

Before loading the extension, you need to add the following library files to the `extension/lib/` directory:

1. **jQuery 3.6.0** - Download from https://code.jquery.com/jquery-3.6.0.min.js
   - Save as `extension/lib/jquery-3.6.0.min.js`

2. **Chess.js** - Download from https://github.com/jhlywa/chess.js
   - Save as `extension/lib/chess.js`

3. **Stockfish 8** - Download from https://github.com/niklasf/stockfish.js
   - Save as `extension/lib/stockfish8.js`

### Loading the Extension

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` directory
5. The extension should now be loaded and active on lichess.org

## Features

### Configuration Presets

Three preset configurations optimized for different time controls:
- **7.5s** - Ultra-fast with high blunder tolerance
- **15s** - Balanced (default)
- **30s** - Conservative with careful timing

### UI Controls

- **Hint** - Show move suggestions
- **Auto** - Toggle automatic move execution
- **Config** - Cycle through presets (7.5s/15s/30s)
- **Arrows** - Toggle move visualization
- **Piece** - Toggle piece selection mode
- **Human** - Enable human-like timing
- **Vary** - Enable varied move selection (anti-pattern)
- **⚡PANIC** - Ultra-fast mode with depth-1 engine
- **+Offset** - VPN/network lag compensation

### Keyboard Shortcuts

- `W` - Toggle hint + auto
- `P` - Toggle piece mode
- `H` - Toggle human mode
- `V` - Toggle varied mode
- `L` - Cycle lag offset

## Development Notes

### Storage Migration

The extension uses `chrome.storage.local` instead of `localStorage`:
- Settings are stored asynchronously
- Cross-tab synchronization
- Better privacy and security

### Message Passing

Background service worker communicates with content scripts via:
- `chrome.runtime.sendMessage()` - Content to background
- `chrome.runtime.onMessage` - Message handler
- Custom events - Inter-content-script communication

### Known Limitations

1. **Stockfish Integration** - The background service worker needs proper stockfish.js integration for manifest v3
2. **Engine Communication** - Message passing between content scripts and background needs full implementation
3. **Icons** - Placeholder icons needed in `extension/icons/`

## Testing

1. Navigate to https://lichess.org
2. Start a game
3. UI dock should appear at bottom center
4. Test each control button
5. Verify move execution and timing

## License

Same as original userscript - Please ensure you have rights to use chess engines and automation on Lichess.

## Credits

Based on "Lichess Funnies" userscript by Michael and Ian
Migrated to browser extension architecture
