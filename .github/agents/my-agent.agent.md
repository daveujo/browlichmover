---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name:agent1
description:browser extension
---

# My Agent
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     BACKGROUND SERVICE WORKER                      │  │
│  │  ┌─────────────────┐    ┌─────────────────┐                       │  │
│  │  │  Engine Manager │    │  Message Router │                       │  │
│  │  │  - Stockfish    │◄──►│  - Tab routing  │                       │  │
│  │  │  - Panic Engine │    │  - Settings     │                       │  │
│  │  └────────┬────────┘    └────────┬────────┘                       │  │
│  └───────────┼──────────────────────┼────────────────────────────────┘  │
│              │                      │                                    │
│              │ chrome.runtime.sendMessage                               │
│              ▼                      ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      CONTENT SCRIPTS                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │  WebSocket  │  │  Game State │  │     UI      │               │  │
│  │  │ Interceptor │◄►│   Manager   │◄►│ Controller  │               │  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────────────┘               │  │
│  │         │                │                                        │  │
│  │         │  ┌─────────────┴─────────────┐                         │  │
│  │         │  │    Move Executor          │                         │  │
│  │         │  │  - Timing Calculator      │                         │  │
│  │         │  │  - Arrow Renderer         │                         │  │
│  │         │  └───────────────────────────┘                         │  │
│  └─────────┼─────────────────────────────────────────────────────────┘  │
│            │                                                             │
│            ▼ WebSocket                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        LICHESS. ORG                                 │  │
│  │  - Game State (FEN, clock, moves)                                 │  │
│  │  - Move Submission                                                │  │
│  │  - Acknowledgments                                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
Describe what your agent does here...
