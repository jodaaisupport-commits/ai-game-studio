// Simple DE/EN-Umschaltung. Statisches HTML via data-i18n="key"
// (data-i18n-ph für Placeholder, data-i18n-html für HTML), dynamische
// Strings via t('key').
const STR = {
  de: {
    brand_sub: 'bauen · spielen · remixen — Three.js + KI',
    play: '▶ Spielen', stop: '■ Stop', save: '💾 Speichern', export: '⤓ Export', import: '⤒ Import', glb: '📦 GLB',
    undo: '↩ Rückgängig', redo: '↪ Wiederholen',
    scene: 'Szene', clear: 'Szene leeren', demo: 'Demo laden', library: 'Bibliothek',
    add: 'Hinzufügen',
    add_box: '🧊 Würfel', add_sphere: '🔮 Kugel', add_capsule: '💊 Kapsel', add_cylinder: '🛢️ Säule',
    add_ramp: '📐 Rampe', add_ground: '🟩 Boden', add_coin: '🪙 Münze', add_enemy: '👾 Gegner',
    add_stairs: '🪜 Treppe', add_bridge: '🌉 Brücke', add_arch: '⛩️ Bogen', add_house: '🏠 Haus',
    add_cone: '🔺 Kegel', add_torus: '⭕ Ring', add_cloud: '☁️ Wolke', add_water: '🌊 Wasser',
    add_spring: '🌀 Feder', add_spikes: '🦔 Stacheln', add_lava: '🌋 Lava', add_heart: '❤️ Herz',
    add_goal: '🏁 Ziel', add_light: '💡 Licht', add_player: '🧑 Spawn', add_tree: '🌲 Deko',
    add_platform: '🛟 Plattform', add_flyer: '🐝 Flieger',
    tools: 'Werkzeug', tool_move: 'Verschieben', tool_rotate: 'Rotieren', tool_scale: 'Skalieren',
    grid: 'Raster', snap: 'Einrasten (0.5 / 15°)', quality: 'Qualität', q_auto: 'Auto', q_high: 'Hoch', q_low: 'Niedrig',
    coop: '👥 2-Spieler Co-op (P2: Pfeiltasten + Enter)',
    help: 'Klick = wählen · Doppelklick = fokussieren · Im Spiel: <b>WASD + Leertaste</b>, Klick = Schießen',
    again: 'Nochmal spielen',
    tab_ai: '✨ KI-Studio', tab_insp: '🔧 Inspektor', tab_code: '🧩 Code',
    ai_hint: 'Beschreibe dein Spiel. Die lokale KI baut sofort eine spielbare 3D-Szene. Optional nutzt du ein kostenloses Online-Modell (OpenCode Zen).',
    ai_ph: 'z. B. ein Münz-Sammler im Park mit 8 Münzen und 2 Gegnern …',
    ai_local: '⚡ Lokal (sofort, offline)', ai_zen: '🌐 Zen-API (online, kostenlos)',
    ai_generate: '✨ Spiel generieren', ai_templates: 'Vorlagen', ai_ready: 'Bereit.',
    insp_title: 'Objekt', insp_empty: 'Nichts gewählt. Klicke ein Objekt in der Szene oder in der Liste.',
    name: 'Name', type: 'Typ', pos: 'Position', scale: 'Skalierung', color: 'Farbe',
    t_static: 'Statisch (Wand/Boden)', t_platform: 'Plattform (beweglich)', t_player: 'Spieler-Spawn',
    t_hazard: 'Falle (Schaden)', t_spring: 'Sprungfeder', t_powerup: 'Power-up (Leben)',
    t_collectible: 'Sammelbar (Münze)', t_enemy: 'Gegner', t_goal: 'Ziel', t_decoration: 'Deko',
    behavior: 'Verhalten', b_patrol: 'Patrouille', b_chase: 'Verfolgen', b_fly: 'Fliegen',
    dup: 'Duplizieren', focus: 'Fokussieren', del: 'Löschen', env: 'Umgebung', sky: 'Himmel',
    sky_day: 'Tag', sky_sunset: 'Sonnenuntergang', sky_night: 'Nacht / Space', sky_desert: 'Wüste', sky_snow: 'Schnee', sky_volcano: 'Vulkan',
    code_hint: 'Eigene Spiellogik (JS, Tab rückt ein, Strg+Enter startet). Verfügbar: api mit score, lives (beide les- und schreibbar), players[], win(msg), lose(msg), toast(t), spawnFX(pos).',
    code_run: '▶ Code + Spielen', code_reset: 'Standard-Code',
    console: 'Konsole:', best: '🏅 Bestleistung',
    hud_score: 'Punkte', hud_objects: 'Objekte',
    msg_empty: 'Leere Szene — lade zuerst Demo, Bibliothek oder generiere ein Spiel.',
    hint_play: '👋 Willkommen! Klicke ▶ Spielen für die Demo — oder beschreibe dein Spiel rechts in der KI.',
    won: '🏆 Gewonnen!', lost: '💥 Verloren', try_again: 'Versuch es nochmal!',
    touch_jump: '⤒', touch_shoot: '◎',
    tut_move: '🎓 Schritt 1/4: Bewege dich mit WASD (oder Joystick)',
    tut_jump: '🎓 Schritt 2/4: Springe mit Leertaste',
    tut_coin: '🎓 Schritt 3/4: Sammle eine Münze ein',
    tut_goal: '🎓 Schritt 4/4: Erreiche das grüne Ziel!'
  },
  en: {
    brand_sub: 'build · play · remix — Three.js + AI',
    play: '▶ Play', stop: '■ Stop', save: '💾 Save', export: '⤓ Export', import: '⤒ Import', glb: '📦 GLB',
    undo: '↩ Undo', redo: '↪ Redo',
    scene: 'Scene', clear: 'Clear scene', demo: 'Load demo', library: 'Library',
    add: 'Add',
    add_box: '🧊 Cube', add_sphere: '🔮 Sphere', add_capsule: '💊 Capsule', add_cylinder: '🛢️ Pillar',
    add_ramp: '📐 Ramp', add_ground: '🟩 Ground', add_coin: '🪙 Coin', add_enemy: '👾 Enemy',
    add_stairs: '🪜 Stairs', add_bridge: '🌉 Bridge', add_arch: '⛩️ Arch', add_house: '🏠 House',
    add_cone: '🔺 Cone', add_torus: '⭕ Ring', add_cloud: '☁️ Cloud', add_water: '🌊 Water',
    add_spring: '🌀 Spring', add_spikes: '🦔 Spikes', add_lava: '🌋 Lava', add_heart: '❤️ Heart',
    add_goal: '🏁 Goal', add_light: '💡 Light', add_player: '🧑 Spawn', add_tree: '🌲 Tree',
    add_platform: '🛟 Platform', add_flyer: '🐝 Flyer',
    tools: 'Tools', tool_move: 'Move', tool_rotate: 'Rotate', tool_scale: 'Scale',
    grid: 'Grid', snap: 'Snap (0.5 / 15°)', quality: 'Quality', q_auto: 'Auto', q_high: 'High', q_low: 'Low',
    coop: '👥 2-player co-op (P2: arrows + Enter)',
    help: 'Click = select · Double-click = focus · In game: <b>WASD + Space</b>, click = shoot',
    again: 'Play again',
    tab_ai: '✨ AI Studio', tab_insp: '🔧 Inspector', tab_code: '🧩 Code',
    ai_hint: 'Describe your game. The local AI instantly builds a playable 3D scene. Optionally use a free online model (OpenCode Zen).',
    ai_ph: 'e.g. a coin collector in the park with 8 coins and 2 enemies …',
    ai_local: '⚡ Local (instant, offline)', ai_zen: '🌐 Zen API (online, free)',
    ai_generate: '✨ Generate game', ai_templates: 'Templates', ai_ready: 'Ready.',
    insp_title: 'Object', insp_empty: 'Nothing selected. Click an object in the scene or list.',
    name: 'Name', type: 'Type', pos: 'Position', scale: 'Scale', color: 'Color',
    t_static: 'Static (wall/floor)', t_platform: 'Platform (moving)', t_player: 'Player spawn',
    t_hazard: 'Trap (damage)', t_spring: 'Jump pad', t_powerup: 'Power-up (life)',
    t_collectible: 'Collectible (coin)', t_enemy: 'Enemy', t_goal: 'Goal', t_decoration: 'Deco',
    behavior: 'Behavior', b_patrol: 'Patrol', b_chase: 'Chase', b_fly: 'Fly',
    dup: 'Duplicate', focus: 'Focus', del: 'Delete', env: 'Environment', sky: 'Sky',
    sky_day: 'Day', sky_sunset: 'Sunset', sky_night: 'Night / Space', sky_desert: 'Desert', sky_snow: 'Snow', sky_volcano: 'Volcano',
    code_hint: 'Custom game logic (JS, Tab indents, Ctrl+Enter runs). Available: api with score, lives (both readable and writable), players[], win(msg), lose(msg), toast(t), spawnFX(pos).',
    code_run: '▶ Code + Play', code_reset: 'Default code',
    console: 'Console:', best: '🏅 Best',
    hud_score: 'Score', hud_objects: 'Objects',
    msg_empty: 'Empty scene — load the demo, a library world or generate a game first.',
    hint_play: '👋 Welcome! Press ▶ Play for the demo — or describe your game in the AI panel.',
    won: '🏆 You win!', lost: '💥 Game over', try_again: 'Try again!',
    touch_jump: '⤒', touch_shoot: '◎',
    tut_move: '🎓 Step 1/4: Move with WASD (or joystick)',
    tut_jump: '🎓 Step 2/4: Jump with Space',
    tut_coin: '🎓 Step 3/4: Collect a coin',
    tut_goal: '🎓 Step 4/4: Reach the green goal!'
  }
}
let lang = localStorage.getItem('ai-studio-lang') || 'de'
export const getLang = () => lang
export function t(key) { return (STR[lang] && STR[lang][key]) || STR.de[key] || key }
export function setLang(l) {
  lang = STR[l] ? l : 'de'
  localStorage.setItem('ai-studio-lang', lang)
  document.documentElement.lang = lang
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n) })
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh) })
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml) })
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle) })
  return lang
}
