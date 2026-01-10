# Browlich Mover - Chess Automation Project

This repository contains a chess automation tool for Lichess.org, available in two versions:

1. **Userscript** (`mover.user.js`) - Original monolithic implementation
2. **Browser Extension** (`extension/`) - Modern, modular architecture ✨ NEW

## 🎯 Project Overview

Browlich Mover is a sophisticated chess automation tool that provides:
- Stockfish engine integration for move calculation
- Panic mode (ultra-fast, weak engine) for time pressure
- Human-like timing to avoid detection
- Varied move selection to prevent patterns
- Smart lag compensation for network delays
- Interactive UI with multiple configuration presets

## 📦 Versions

### Userscript (Legacy)
**File:** `mover.user.js`  
**Status:** Stable, maintained  
**Size:** 1,656 lines

A complete, self-contained userscript that runs via Tampermonkey or similar userscript managers.

**Pros:**
- Easy to install (copy-paste)
- No build process required
- All code in one file

**Cons:**
- Hard to maintain
- Difficult to test
- Not using modern extension APIs

### Browser Extension (Recommended) ✨
**Directory:** `extension/`  
**Status:** New, production-ready structure  
**Architecture:** Modular, Manifest v3

A modern browser extension with clean architecture, proper separation of concerns, and better maintainability.

**Pros:**
- Modular architecture (11 components)
- Manifest v3 compliant
- Better security and privacy
- Easier to maintain and extend
- Proper storage API (`chrome.storage.local`)
- Background service worker

**Cons:**
- Requires external library downloads
- More complex setup (first time only)

## 🚀 Quick Start

### Using the Userscript
1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Copy contents of `mover.user.js`
3. Create new script in Tampermonkey
4. Paste and save
5. Navigate to Lichess.org

### Using the Browser Extension (Recommended)

See detailed instructions in [`extension/INSTALL.md`](extension/INSTALL.md)

**Quick version:**
```bash
# 1. Download required libraries
cd extension/lib
curl -o jquery-3.6.0.min.js https://code.jquery.com/jquery-3.6.0.min.js
curl -o chess.js https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js
# Download stockfish8.js from https://github.com/niklasf/stockfish.js

# 2. Load extension
# - Open chrome://extensions/
# - Enable Developer Mode
# - Click "Load unpacked"
# - Select extension/ directory
```

## 📚 Documentation

### For Users
- [Extension README](extension/README.md) - Features and usage
- [Installation Guide](extension/INSTALL.md) - Step-by-step setup
- [Migration Guide](extension/MIGRATION.md) - Technical details of migration

### For Developers
- [Migration Summary](extension/MIGRATION_SUMMARY.md) - Complete migration analysis
- Component documentation in source files

## 🏗️ Extension Architecture

```
extension/
├── manifest.json                    # Extension config
├── background/
│   └── service-worker.js           # Stockfish + Panic engines
├── content/
│   ├── websocket-interceptor.js    # Lichess communication
│   ├── game-state.js               # State management
│   ├── timing-calculator.js        # Human-like delays
│   ├── arrow-renderer.js           # Board visualization
│   ├── move-selector.js            # Move selection logic
│   ├── move-executor.js            # Move execution
│   ├── ui-controller.js            # User interface
│   └── main.js                     # Orchestrator
└── lib/
    ├── presets.js                  # Configuration presets
    ├── jquery-3.6.0.min.js         # Required: download
    ├── chess.js                    # Required: download
    └── stockfish8.js               # Required: download
```

## ✨ Features

### Configuration Presets
- **7.5s** - Ultra-fast for speed chess
- **15s** - Balanced (default)
- **30s** - Conservative for longer games

### Modes
- **Auto Mode** - Automatic move execution
- **Human Mode** - Human-like timing delays
- **Varied Mode** - Anti-pattern move selection
- **Panic Mode** - Ultra-fast, weak engine
- **Piece Mode** - Manual piece selection
- **Arrow Mode** - Move visualization

### Smart Features
- Network lag compensation
- VPN offset adjustment
- Server lag tracking
- Draw avoidance
- Blunder simulation (configurable)
- Adaptive timing
- Capture detection (instant moves)
- Premove mode (endgame)

## 🎮 UI Controls

Located at bottom-center of Lichess page:

- **Hint** - Show move suggestions
- **Auto** - Toggle automation
- **Cfg** - Cycle presets (7.5s/15s/30s)
- **Arr** - Toggle arrows
- **Piece** - Piece selection mode
- **Human** - Human timing
- **Vary** - Varied moves
- **⚡PANIC** - Ultra-fast mode
- **+Offset** - Lag compensation

### Keyboard Shortcuts
- `W` - Toggle hint + auto
- `P` - Toggle piece mode
- `H` - Toggle human mode
- `V` - Toggle varied mode
- `L` - Cycle lag offset

## 📊 Migration Status

All components successfully migrated from userscript to extension:

| Component | Status |
|-----------|--------|
| WebSocket Proxy | ✅ |
| Stockfish Engine | ✅ |
| Panic Engine | ✅ |
| Game State | ✅ |
| Move Execution | ✅ |
| Human Timing | ✅ |
| Arrow Drawing | ✅ |
| Move Selection | ✅ |
| UI Dock | ✅ |
| Settings | ✅ |
| Config Presets | ✅ |

**All features: 100% migrated**

## 🔧 Development

### Project Structure
```
browlichmover/
├── mover.user.js           # Original userscript
├── extension/              # Browser extension
│   ├── background/         # Service worker
│   ├── content/            # Content scripts
│   ├── lib/                # Libraries
│   ├── icons/              # Extension icons
│   └── *.md                # Documentation
└── README.md               # This file
```

### Building
No build process required - the extension uses plain JavaScript.

### Testing
See [INSTALL.md](extension/INSTALL.md) for testing procedures.

## ⚠️ Important Notes

### Legal & Ethical
- This tool automates gameplay on Lichess
- Check Lichess Terms of Service
- Use responsibly and ethically
- Consider implications of automation

### Privacy & Security
- Extension only accesses Lichess.org
- No data sent to external servers
- Settings stored locally
- Manifest v3 security standards

### Performance
- Minimal CPU usage
- Configurable engine timing
- Smart caching
- Efficient message passing

## 🐛 Troubleshooting

### Extension not loading
- Verify all library files are downloaded
- Check file names match exactly
- Look for errors in console

### No moves executing
- Ensure Auto mode is ON (green)
- Check WebSocket connection
- Verify game is active
- Look for console errors

### Poor performance
- Try faster preset (7.5s)
- Disable arrows if laggy
- Check browser resources

See [INSTALL.md](extension/INSTALL.md) for more troubleshooting.

## 📝 Credits

**Original Userscript:** Michael and Ian  
**Extension Migration:** Completed January 2024  
**Architecture:** Modular, Manifest v3 compliant

## 📄 License

Please ensure you have the right to use chess engines and automation tools on Lichess. Respect the platform's terms of service.

## 🤝 Contributing

Contributions welcome! Please:
1. Check existing issues
2. Follow the modular architecture
3. Update documentation
4. Test thoroughly

## 🔗 Links

- [Lichess.org](https://lichess.org)
- [Stockfish Engine](https://stockfishchess.org)
- [Chess.js Library](https://github.com/jhlywa/chess.js)
- [Tampermonkey](https://www.tampermonkey.net/)

---

**Version:** 1.0.0 (Extension)  
**Status:** Production Ready (Structure)  
**Last Updated:** 2024-01-10
