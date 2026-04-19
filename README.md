# TikLive Studio 🎮

TikTok LIVE Dashboard für macOS — ähnlich wie TikFinity / TikTory.

## Features

- **Live Stats** — Zuschauer, Likes, Follower, Shares in Echtzeit
- **Events & Actions** — Tasten automatisch drücken wenn Events eintreten
  - Beispiel: `space` bei jedem Follow (für Geometry Dash!)
  - Alle 1000 Likes → beliebige Taste
- **Live Chat** — Vollständiger Chat mit Avataren
- **Overlay** — Transparentes Fenster für OBS/TikTok Live Studio
  - Stats-Pills, Chat-Bubbles, Follow-Banner, Gift-Alerts
- **Goals** — Like & Follower Goals mit Fortschrittsbalken
- **Subathon Timer** — Als OBS Browser-Source
- **WebSocket Server** — Port 3456 für externe Browser-Sources

## Setup

```bash
git clone https://github.com/GhostyShot/TikTok-Live-App-Mac
cd TikTok-Live-App-Mac
bash setup.sh
npm start
```

## DMG bauen

```bash
npm run build:dmg
# → dist/TikLive Studio-1.0.0-arm64.dmg
```

## Keystroke-Automation

Nutzt AppleScript (`osascript`) — kein nativer Build nötig!

Einmalig zulassen: **Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen → TikLive Studio**

## Stack

- Electron 29
- tiktok-live-connector (TikTok Webcast WebSocket)
- AppleScript für Keystroke-Automation
- electron-store für persistente Settings
- WebSocket Server (ws) für OBS Browser-Sources
