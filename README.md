# ai-game-studio

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/jodaaisupport-commits/ai-game-studio)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/jodaaisupport-commits/ai-game-studio)

- 🎮 [Open the project](https://omgithub.com/jodaaisupport-commits/ai-game-studio).
- ✨ [Remix this project](https://omgithub.com/?remix=jodaaisupport-commits%2Fai-game-studio).
- 💻 [Explore the source](https://github.com/jodaaisupport-commits/ai-game-studio).
- 🛠️ [Check build runs](https://github.com/jodaaisupport-commits/ai-game-studio/actions).
- 🐛 [Report an issue](https://github.com/jodaaisupport-commits/ai-game-studio/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/jodaaisupport-commits).
- 🌍 [Create with OMGithub](https://omgithub.com).
- 🧬 [Explore the remix source](https://github.com/jodaaisupport-commits/ai-game-studio).
<!-- omgithub:readme:end -->

# ◈ AI 3D Game Studio

Browserbasiertes 3D-Spiele-Studio mit Three.js und KI-Generierung — auf Deutsch & Englisch, sofort spielbar, mobilfähig.

**Start:** `npm install && npm run dev` (Port 3002) · **Build:** `npm run build` (→ `dist/`)

## Was es kann

- **3D-Editor:** 26 Bau-Objekte (Würfel, Kugel, Treppe, Brücke, Torbogen, Haus, Kegel, Ring, Wolke, Wasser, Plattform, Sprungfeder, Stacheln, Lava, Herz …) per Klick wählen, per Gizmo verschieben/rotieren/skalieren (mit Einrasten, ohne Kamera-Kampf), Hierarchie mit Szenen-Titel, Live-Inspektor (Position, Farbe, Spiel-Typ, Gegner-Verhalten), GLB-Upload mit Auto-Größe (bleibt bei Undo/Redo und Speichern erhalten), Export/Import als JSON (Dateiname mit Titel + Datum), Speichern im Browser, **Undo/Redo (Strg+Z/Y)**. Shortcuts: **F** fokussieren, **Strg+D** duplizieren, **Esc** Auswahl aufheben, **Strg+Enter** spielen.
- **✨ KI-Studio:** Spielidee eintippen → lokale KI baut sofort eine spielbare Szene (Sammler, Labyrinth, Parkour, Arena — erkennt Thema inkl. Wüste, Lagune, Schnee, Vulkan, Anzahl Münzen/Gegner, Himmel). Optional: kostenlose Online-Modelle via OpenCode Zen.
- **📚 Bibliothek:** 13 kuratierte Szenen (Sammler, Labyrinth, Parkour, Arena, Wüste, Lagune, Schneedorf, Vulkan-Parkour, Hindernis-Parcours, Himmelsinseln …) + geführtes **Tutorial** mit Schritt-Hinweisen.
- **▶ Spielmodus:** Third-Person-Steuerung (WASD + Leertaste, Tap/Klick = Schießen — kein versehentlicher Schuss nach Kamera-Drag), Münzen, patrouillierende/verfolgende/fliegende Gegner, Stachel- und Lava-Fallen, Sprungfedern, Extra-Leben, bewegliche Plattformen, Treppen, Leben, Timer, **Bestleistung**, Sieg/Niederlage mit **Sound** (WebAudio, abschaltbar), **2-Spieler Co-op** (P2: Pfeiltasten + Enter).
- **🧩 Code-Tab:** Eigene Spiellogik in JS mit Tab-Einrückung (`api.score`/`api.lives` les- und schreibbar, `players[]`, `toast()`, Rezepte im Standard-Code) — läuft jedes Frame.
- **📱 Mobile:** Touch-Joystick + Springen/Schießen-Buttons, Wisch-Kamera, responsives Layout (Viewport oben, Panels darunter), Auto-Qualität (Schatten + Pixel-Ratio), installierbar als **PWA** (Manifest + Offline-Service-Worker), DE/EN-Umschalter.
