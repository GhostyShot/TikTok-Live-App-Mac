#!/bin/bash
# TikLive Studio — macOS Setup
set -e
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     TikLive Studio — Setup           ║"
echo "╚══════════════════════════════════════╝"
echo ""
if ! command -v node &> /dev/null; then echo "❌ Node.js nicht gefunden."; exit 1; fi
echo "✅ Node.js $(node -v)"
echo "📦 Installiere npm dependencies..."
npm install
# Build icns icon on macOS
if [ -d "assets/icon.iconset" ]; then
  iconutil -c icns assets/icon.iconset -o assets/icon.icns 2>/dev/null && echo "✅ Icon.icns erstellt" || echo "⚠️  iconutil fehlgeschlagen"
fi
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Setup abgeschlossen! ✅           ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Starten:   npm start"
echo "DMG bauen: npm run build:dmg"
echo ""
echo "⚠️  Für Keystrokes: Systemeinstellungen → Datenschutz & Sicherheit"
echo "   → Bedienungshilfen → TikLive Studio zulassen"
echo ""
