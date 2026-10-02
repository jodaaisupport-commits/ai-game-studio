// Lokale prozedurale Spiel-Generatoren. Jede Funktion liefert
// Szenen-Specs: { kind, name, gameType, pos:[x,y,z], scale:[x,y,z], color, extra }
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

export function themeColors(theme) {
  if (theme === 'space') return { ground: '#1a1f3a', wall: '#3b3f7a', accent: '#7c5cff', coin: '#ffd94d', sky: 'night' }
  if (theme === 'sunset') return { ground: '#4a3348', wall: '#7a4a5a', accent: '#ff7a59', coin: '#ffd94d', sky: 'sunset' }
  if (theme === 'forest') return { ground: '#2e7d4f', wall: '#6b4a2f', accent: '#37d67a', coin: '#ffd94d', sky: 'day' }
  if (theme === 'desert') return { ground: '#d9b06a', wall: '#a5713f', accent: '#ff7a59', coin: '#ffd94d', sky: 'desert' }
  if (theme === 'lagoon') return { ground: '#e3c98f', wall: '#8a6b4a', accent: '#ff7a59', coin: '#ffd94d', sky: 'day' }
  if (theme === 'snow') return { ground: '#e6eef7', wall: '#7a8ba0', accent: '#4da3ff', coin: '#ffd94d', sky: 'snow' }
  if (theme === 'volcano') return { ground: '#3a2626', wall: '#5a3a3a', accent: '#ff4d2e', coin: '#ffb020', sky: 'volcano' }
  return { ground: '#3f9e57', wall: '#8a6b4a', accent: '#37d67a', coin: '#ffd94d', sky: 'day' }
}
// Briefing-Helfer: deutsche oder englische Satzvariante
const B = (lang, de, en) => (lang === 'en' ? en : de)

function groundSpec(color) {
  return { kind: 'ground', name: 'Boden', gameType: 'static', pos: [0, 0, 0], scale: [60, 1, 60], color }
}
function spawnSpec(x = 0, z = 8) {
  return { kind: 'player', name: 'Spawn', gameType: 'player', pos: [x, 1.5, z], scale: [1, 1, 1], color: '#4da3ff' }
}
function coinRing(n, cx, cz, r, y = 1) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push({ kind: 'coin', name: `Münze ${i + 1}`, gameType: 'collectible', pos: [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r], scale: [1, 1, 1], color: '#ffd94d' })
  }
  return out
}

export function buildCollector(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors(o.theme || 'forest')
  const nCoins = o.coins ?? 8
  const nEnemies = o.enemies ?? 2
  const specs = [groundSpec(th.ground), spawnSpec(0, 10)]
  // Deko-Bäume am Rand
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, r = 20 + rng() * 8
    specs.push({ kind: 'tree', name: `Baum ${i + 1}`, gameType: 'decoration', pos: [Math.cos(a) * r, 0, Math.sin(a) * r], scale: [0.8 + rng() * 0.8, 0.8 + rng() * 1.2, 0.8 + rng() * 0.8], color: '#2e7d4f' })
  }
  // ein paar Hindernis-Blöcke
  for (let i = 0; i < 5; i++) {
    specs.push({ kind: 'box', name: `Block ${i + 1}`, gameType: 'static', pos: [(rng() - 0.5) * 24, 0.75, (rng() - 0.5) * 24], scale: [1 + rng() * 3, 1.5, 1 + rng() * 3], color: th.wall })
  }
  specs.push(...coinRing(nCoins, 0, 0, 6 + rng() * 4))
  for (let i = 0; i < nEnemies; i++) {
    specs.push({ kind: 'enemy', name: `${lang === 'en' ? 'Chaser' : 'Gegner'} ${i + 1}`, gameType: 'enemy', pos: [(rng() - 0.5) * 16, 0.8, (rng() - 0.5) * 16], scale: [1, 1, 1], color: '#ff4d5e', extra: { range: 4 + rng() * 4, speed: 1 + rng() * 1.5, behavior: i % 2 === 0 ? 'chase' : 'patrol' } })
  }
  specs.push({ kind: 'goal', name: 'Zieltor', gameType: 'goal', pos: [0, 1.5, -12], scale: [1.4, 1.4, 1.4], color: th.accent })
  // Abwechslung: Sprungfeder + Stachelfallen + Extra-Leben
  specs.push({ kind: 'spring', name: 'Feder', gameType: 'spring', pos: [5, 0, 6], scale: [1, 1, 1], color: '#37d67a' })
  specs.push({ kind: 'spikes', name: 'Stacheln', gameType: 'hazard', pos: [-5, 0, -2], scale: [1, 1, 1], color: '#b9c2d0' })
  specs.push({ kind: 'spikes', name: 'Stacheln 2', gameType: 'hazard', pos: [6, 0, -6], scale: [1, 1, 1], color: '#b9c2d0' })
  if (rng() > 0.4) specs.push({ kind: 'heart', name: 'Herz', gameType: 'powerup', pos: [(rng() - 0.5) * 10, 1.2, (rng() - 0.5) * 10], scale: [1, 1, 1], color: '#ff4d6d' })
  return { specs, sky: th.sky, briefing: B(lang, `Sammler: ${nCoins} Münzen einsammeln, ${nEnemies} Gegnern ausweichen, dann ins Zieltor. Vorsicht vor Stacheln — die Feder katapultiert dich!`, `Collector: grab ${nCoins} coins, dodge ${nEnemies} enemies, then reach the gate. Watch the spikes — the spring launches you!`) }
}

export function buildMaze(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors(o.theme || 'default')
  const specs = [groundSpec(th.ground), spawnSpec(-9, 9)]
  const S = 4, N = 5 // 5x5 Zellen
  const wall = th.wall
  // Außenmauern
  specs.push({ kind: 'box', name: 'Mauer N', gameType: 'static', pos: [0, 1.5, -11], scale: [24, 3, 1], color: wall })
  specs.push({ kind: 'box', name: 'Mauer S', gameType: 'static', pos: [0, 1.5, 11], scale: [24, 3, 1], color: wall })
  specs.push({ kind: 'box', name: 'Mauer W', gameType: 'static', pos: [-11, 1.5, 0], scale: [1, 3, 24], color: wall })
  specs.push({ kind: 'box', name: 'Mauer O', gameType: 'static', pos: [11, 1.5, 0], scale: [1, 3, 24], color: wall })
  // Innenlabyrinth (deterministisch + rng-Lücken)
  let ci = 0
  for (let gx = 0; gx < N; gx++) for (let gz = 0; gz < N; gz++) {
    if ((gx + gz) % 2 === 0 && rng() > 0.35) {
      const x = -8 + gx * S, z = -8 + gz * S
      const horiz = rng() > 0.5
      specs.push({ kind: 'box', name: `Wand ${++ci}`, gameType: 'static', pos: [x, 1.25, z], scale: horiz ? [S, 2.5, 0.8] : [0.8, 2.5, S], color: wall })
    }
  }
  const coins = coinRing(o.coins ?? 5, 0, 0, 5)
  coins.forEach(c => { c.pos[1] = 1; specs.push(c) })
  for (let i = 0; i < (o.enemies ?? 1); i++) {
    specs.push({ kind: 'enemy', name: `${lang === 'en' ? 'Guard' : 'Wächter'} ${i + 1}`, gameType: 'enemy', pos: [4 + i * 3, 0.8, -4], scale: [1, 1, 1], color: '#ff4d5e', extra: { range: 3, speed: 1.2, behavior: 'chase' } })
  }
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [9, 1.5, -9], scale: [1.4, 1.4, 1.4], color: th.accent })
  return { specs, sky: th.sky, briefing: B(lang, `Labyrinth: finde den Weg zum Ziel. ${coins.length} Münzen als Bonus.`, `Maze: find your way to the goal. ${coins.length} bonus coins.`) }
}

export function buildParkour(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors(o.theme || 'sunset')
  const specs = [groundSpec(th.ground), spawnSpec(0, 10)]
  let x = 0, z = 8, y = 1
  const n = o.platforms ?? 9
  for (let i = 0; i < n; i++) {
    z -= 3.2; x += (rng() - 0.5) * 5; y = Math.min(y + (rng() > 0.4 ? 0.8 : 0), 8)
    const s = 2.6 - (i / n) * 1.1
    specs.push({ kind: 'box', name: `Plattform ${i + 1}`, gameType: 'static', pos: [x, y, z], scale: [s, 0.5, s], color: i === n - 1 ? th.accent : pick(rng, ['#5aa9ff', '#7c5cff', '#ff7ab8', '#ffb020']) })
    if (i % 2 === 0) specs.push({ kind: 'coin', name: `Münze ${i + 1}`, gameType: 'collectible', pos: [x, y + 1.2, z], scale: [1, 1, 1], color: '#ffd94d' })
  }
  specs.push({ kind: 'goal', name: 'Gipfel', gameType: 'goal', pos: [x, y + 1.6, z - 0.5], scale: [1.5, 1.5, 1.5], color: '#37d67a' })
  for (let i = 0; i < (o.enemies ?? 0); i++) {
    specs.push({ kind: 'enemy', name: `${lang === 'en' ? 'Enemy' : 'Gegner'} ${i + 1}`, gameType: 'enemy', pos: [(rng() - 0.5) * 10, 0.8, (rng() - 0.5) * 10], scale: [1, 1, 1], color: '#ff4d5e', extra: { range: 4, speed: 1.5, behavior: 'patrol' } })
  }
  return { specs, sky: th.sky, briefing: B(lang, `Parkour: ${n} Plattformen bis zum Gipfel. Springen mit Leertaste.`, `Parkour: ${n} platforms to the summit. Jump with Space.`) }
}

export function buildShooter(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors(o.theme || 'space')
  const specs = [groundSpec(th.ground), spawnSpec(0, 10)]
  // Arena-Mauern (niedrig)
  const W = 26
  specs.push({ kind: 'box', name: 'Arena N', gameType: 'static', pos: [0, 0.75, -W / 2], scale: [W, 1.5, 1], color: th.wall })
  specs.push({ kind: 'box', name: 'Arena S', gameType: 'static', pos: [0, 0.75, W / 2], scale: [W, 1.5, 1], color: th.wall })
  specs.push({ kind: 'box', name: 'Arena W', gameType: 'static', pos: [-W / 2, 0.75, 0], scale: [1, 1.5, W], color: th.wall })
  specs.push({ kind: 'box', name: 'Arena O', gameType: 'static', pos: [W / 2, 0.75, 0], scale: [1, 1.5, W], color: th.wall })
  // Deckungen
  for (let i = 0; i < 6; i++) {
    specs.push({ kind: 'box', name: `Deckung ${i + 1}`, gameType: 'static', pos: [(rng() - 0.5) * 18, 0.75, (rng() - 0.5) * 18], scale: [1.5 + rng() * 2, 1.5, 1.5], color: '#2c3550' })
  }
  const n = o.enemies ?? 5
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    specs.push({ kind: 'enemy', name: `${lang === 'en' ? 'Drone' : 'Drohne'} ${i + 1}`, gameType: 'enemy', pos: [Math.cos(a) * 8, 0.8, Math.sin(a) * 8], scale: [1, 1, 1], color: '#ff4d5e', extra: { range: 5, speed: 1 + rng(), behavior: i % 2 ? 'chase' : 'patrol' } })
  }
  // Fliegende Gegner — nur per Schuss erreichbar
  const nFly = o.flyers ?? 2
  for (let i = 0; i < nFly; i++) {
    specs.push({ kind: 'flyer', name: `${lang === 'en' ? 'Wasp' : 'Wespe'} ${i + 1}`, gameType: 'enemy', pos: [(rng() - 0.5) * 14, 3.2, (rng() - 0.5) * 14], scale: [1, 1, 1], color: '#b45cff', extra: { range: 5, speed: 1.2 + rng(), behavior: 'fly' } })
  }
  specs.push(...coinRing(o.coins ?? 4, 0, 0, 4))
  specs.push({ kind: 'goal', name: 'Zieltor', gameType: 'goal', pos: [0, 1.5, -10], scale: [1.4, 1.4, 1.4], color: th.accent })
  return { specs, sky: th.sky, briefing: B(lang, `Arena: Klicke zum Schießen, besiege ${n} Drohnen und ${nFly} Wespen, sammle Münzen, erreiche das Tor.`, `Arena: click to shoot, defeat ${n} drones and ${nFly} wasps, grab coins, reach the gate.`) }
}

export const TEMPLATES = { collector: buildCollector, maze: buildMaze, parkour: buildParkour, shooter: buildShooter }

// Geführtes Tutorial: Treppe + bewegliche Plattform + Münzspur + Ziel
export function buildTutorial(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('forest')
  const specs = [groundSpec(th.ground), spawnSpec(0, 10)]
  // Münzspur nach vorn
  for (let i = 0; i < 3; i++) {
    specs.push({ kind: 'coin', name: `Münze ${i + 1}`, gameType: 'collectible', pos: [0, 1, 7 - i * 2.5], scale: [1, 1, 1], color: '#ffd94d' })
  }
  // Treppe (3 Stufen à 0.35 — per Auto-Step begehbar)
  for (let i = 0; i < 3; i++) {
    specs.push({ kind: 'box', name: `Stufe ${i + 1}`, gameType: 'static', pos: [0, 0.175 + i * 0.35, -1 - i * 1.2], scale: [3, 0.35 + i * 0.35, 1.2], color: '#8a6b4a' })
  }
  // Bewegliche Plattform über eine Lücke
  specs.push({ kind: 'box', name: 'Lücke', gameType: 'static', pos: [-4, -0.4, -8], scale: [4, 0.2, 6], color: '#224433' })
  specs.push({ kind: 'platform', name: 'Fähre', gameType: 'platform', pos: [0, 0.9, -8], scale: [2.4, 0.35, 2.4], color: '#4da3ff', extra: { axis: 'x', range: 3.5, speed: 0.9 } })
  specs.push({ kind: 'box', name: 'Steg', gameType: 'static', pos: [0, 0.75, -12], scale: [4, 1.5, 3], color: '#8a6b4a' })
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [0, 2.2, -12], scale: [1.4, 1.4, 1.4], color: '#37d67a' })
  return {
    specs, sky: th.sky,
    briefing: B(lang, 'Tutorial: folge den Münzen, steige die Treppe hoch, nutze die Fähre und erreiche das Ziel.', 'Tutorial: follow the coins, climb the stairs, ride the ferry and reach the goal.'),
    tutorial: true
  }
}

// ---- Fünf komplette Welten ----
export function buildLagoon(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('lagoon')
  const specs = [groundSpec(th.ground), spawnSpec(0, 10)]
  // Wasser-Pools mit Brücken
  for (const [px, pz] of [[-5, 1], [5, -3]]) {
    specs.push({ kind: 'water', name: 'Lagune', gameType: 'decoration', pos: [px, 0.55, pz], scale: [8, 1, 6], color: '#2fa8c7' })
    specs.push({ kind: 'bridge', name: 'Steg', gameType: 'static', pos: [px, 0.75, pz], scale: [1, 1, 1], color: '#8a6b4a' })
    specs.push({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [px - 1.5, 1.8, pz], scale: [1, 1, 1], color: '#ffd94d' })
    specs.push({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [px + 1.5, 1.8, pz], scale: [1, 1, 1], color: '#ffd94d' })
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2, r = 16 + rng() * 8
    specs.push({ kind: 'tree', name: `Palme ${i + 1}`, gameType: 'decoration', pos: [Math.cos(a) * r, 0, Math.sin(a) * r], scale: [1, 1 + rng(), 1], color: '#3fae5a' })
  }
  for (let i = 0; i < 2; i++) {
    specs.push({ kind: 'enemy', name: `${lang === 'en' ? 'Crab' : 'Krabbe'} ${i + 1}`, gameType: 'enemy', pos: [(rng() - 0.5) * 14, 0.8, (rng() - 0.5) * 10], scale: [1, 1, 1], color: '#e05252', extra: { range: 4, speed: 1.4, behavior: 'chase' } })
  }
  specs.push({ kind: 'heart', name: 'Herz', gameType: 'powerup', pos: [0, 1.2, 6], scale: [1, 1, 1], color: '#ff4d6d' })
  specs.push({ kind: 'arch', name: 'Torbogen', gameType: 'static', pos: [0, 0, -10], scale: [1, 1, 1], color: '#f2e3c2' })
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [0, 1.5, -10], scale: [1.2, 1.2, 1.2], color: '#37d67a' })
  return { specs, sky: th.sky, briefing: B(lang, 'Lagune: über 2 Stege balancieren, 4 Münzen, 2 Krabben ausweichen, durch den Torbogen zum Ziel.', 'Lagoon: cross 2 jetties, 4 coins, dodge 2 crabs, through the arch to the goal.') }
}

export function buildSnowVillage(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('snow')
  const specs = [groundSpec(th.ground), spawnSpec(-8, 8)]
  const houses = [[-4, -6], [4, -7], [0, 2]]
  houses.forEach(([x, z], i) => {
    specs.push({ kind: 'house', name: `${lang === 'en' ? 'Cabin' : 'Hütte'} ${i + 1}`, gameType: 'static', pos: [x, 0, z], scale: [1, 1, 1], color: ['#7a5a3a', '#6a6a8a', '#8a5a4a'][i] })
  })
  for (let i = 0; i < 8; i++) {
    specs.push({ kind: 'tree', name: `${lang === 'en' ? 'Fir' : 'Tanne'} ${i + 1}`, gameType: 'decoration', pos: [(rng() - 0.5) * 30, 0, (rng() - 0.5) * 30], scale: [0.9, 0.9 + rng() * 0.6, 0.9], color: '#eef4fb' })
  }
  specs.push(...coinRing(o.coins ?? 6, 0, -2, 7))
  specs.push({ kind: 'enemy', name: lang === 'en' ? 'Wolf' : 'Wolf', gameType: 'enemy', pos: [6, 0.8, 4], scale: [1, 1, 1], color: '#8a93a6', extra: { range: 5, speed: 1.6, behavior: 'chase' } })
  specs.push({ kind: 'spring', name: 'Feder', gameType: 'spring', pos: [-6, 0, 0], scale: [1, 1, 1], color: '#37d67a' })
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [8, 1.5, -9], scale: [1.4, 1.4, 1.4], color: '#4da3ff' })
  return { specs, sky: th.sky, briefing: B(lang, 'Schneedorf: 6 Münzen zwischen den Hütten, Wolf entkommen, Feder testen, Ziel im Nordosten.', 'Snow village: 6 coins between cabins, escape the wolf, try the spring, goal in the northeast.') }
}

export function buildVolcanoParkour(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('volcano')
  const specs = [groundSpec(th.ground), spawnSpec(0, 12)]
  // Lavafelder als Schadenszonen
  for (const [x, z, w] of [[0, 6, 10], [-3, 0, 8], [3, -6, 10]]) {
    specs.push({ kind: 'lava', name: 'Lava', gameType: 'hazard', pos: [x, 0, z], scale: [w, 1, 3], color: '#ff5a1e' })
  }
  // Steine als sichere Tritte + Fähren als Abkürzung
  specs.push({ kind: 'box', name: 'Fels', gameType: 'static', pos: [0, 0.75, 6], scale: [2, 1.5, 2], color: '#4a3a3a' })
  specs.push({ kind: 'platform', name: 'Fähre', gameType: 'platform', pos: [0, 0.9, 0], scale: [2.4, 0.35, 2.4], color: '#ff7a59', extra: { axis: 'x', range: 4, speed: 1 } })
  specs.push({ kind: 'platform', name: 'Fähre 2', gameType: 'platform', pos: [0, 0.9, -6], scale: [2.4, 0.35, 2.4], color: '#ff7a59', extra: { axis: 'x', range: 4, speed: 1.3 } })
  specs.push({ kind: 'spring', name: 'Feder', gameType: 'spring', pos: [-6, 0, 10], scale: [1, 1, 1], color: '#37d67a' })
  specs.push({ kind: 'cone', name: 'Vulkankegel', gameType: 'static', pos: [9, 0, 9], scale: [2, 2, 2], color: '#5a2a2a' })
  specs.push({ kind: 'cone', name: 'Vulkankegel 2', gameType: 'static', pos: [-9, 0, -9], scale: [1.5, 1.5, 1.5], color: '#5a2a2a' })
  specs.push(...coinRing(5, 0, -2, 5))
  specs.push({ kind: 'heart', name: 'Herz', gameType: 'powerup', pos: [0, 2.2, -6], scale: [1, 1, 1], color: '#ff4d6d' })
  specs.push({ kind: 'goal', name: 'Krater-Ziel', gameType: 'goal', pos: [0, 1.5, -12], scale: [1.5, 1.5, 1.5], color: '#ffd94d' })
  return { specs, sky: th.sky, briefing: B(lang, 'Vulkan-Parkour: über Lavafelder — Steine, Fähren und Feder nutzen, 5 Münzen, Ziel am Krater.', 'Volcano parkour: cross lava fields — use rocks, ferries and spring, 5 coins, goal at the crater.') }
}

export function buildObstacle(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('default')
  const specs = [groundSpec(th.ground), spawnSpec(0, 12)]
  // Treppe auf eine Mauer
  specs.push({ kind: 'stairs', name: 'Treppe', gameType: 'static', pos: [0, 0, 8], scale: [1, 1, 1], color: '#8a6b4a' })
  specs.push({ kind: 'box', name: 'Mauer', gameType: 'static', pos: [0, 0.9, 4.4], scale: [6, 1.8, 3], color: '#8a6b4a' })
  specs.push({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [-1.5, 2.6, 4.4], scale: [1, 1, 1], color: '#ffd94d' })
  specs.push({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [1.5, 2.6, 4.4], scale: [1, 1, 1], color: '#ffd94d' })
  // Stachel-Gasse (darüber springen oder außen rum)
  specs.push({ kind: 'spikes', name: 'Stacheln', gameType: 'hazard', pos: [-1, 0, 0], scale: [1, 1, 1], color: '#b9c2d0' })
  specs.push({ kind: 'spikes', name: 'Stacheln 2', gameType: 'hazard', pos: [1, 0, 0], scale: [1, 1, 1], color: '#b9c2d0' })
  // Feder zum Herz auf dem Turm
  specs.push({ kind: 'box', name: 'Turm', gameType: 'static', pos: [5, 1.5, -2], scale: [2, 3, 2], color: '#5a6a8a' })
  specs.push({ kind: 'spring', name: 'Feder', gameType: 'spring', pos: [5, 0, 1.5], scale: [1, 1, 1], color: '#37d67a' })
  specs.push({ kind: 'heart', name: 'Herz', gameType: 'powerup', pos: [5, 4.2, -2], scale: [1, 1, 1], color: '#ff4d6d' })
  // Fähre über Lava zum Zielbogen
  specs.push({ kind: 'lava', name: 'Lava', gameType: 'hazard', pos: [0, 0, -7], scale: [10, 1, 3], color: '#ff5a1e' })
  specs.push({ kind: 'platform', name: 'Fähre', gameType: 'platform', pos: [0, 0.9, -7], scale: [2.4, 0.35, 2.4], color: '#4da3ff', extra: { axis: 'x', range: 4, speed: 1.1 } })
  specs.push({ kind: 'arch', name: 'Zielbogen', gameType: 'static', pos: [0, 0, -11], scale: [1, 1, 1], color: '#37d67a' })
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [0, 1.5, -11], scale: [1.2, 1.2, 1.2], color: '#37d67a' })
  return { specs, sky: th.sky, briefing: B(lang, 'Hindernis-Parcours: Treppe → Mauer-Münzen → Stacheln überspringen → Feder zum Herz → Fähre über Lava → Zielbogen.', 'Obstacle course: stairs → wall coins → jump spikes → spring to heart → ferry over lava → goal arch.') }
}

export function buildSkyIslands(rng, o = {}) {
  const lang = o.lang || 'de'
  const th = themeColors('day')
  const specs = []
  // Inselkette aufsteigend (kein Boden — Fallen = aus!)
  const islands = [[0, 0, 10, 6], [0, 1, 4, 5], [4, 2, -1, 5], [4, 3, -7, 4], [-1, 4, -11, 5]]
  islands.forEach(([x, y, z, w], i) => {
    specs.push({ kind: 'box', name: `${lang === 'en' ? 'Island' : 'Insel'} ${i + 1}`, gameType: 'static', pos: [x, y - 0.5, z], scale: [w, 1, w], color: i % 2 ? '#3f9e57' : '#5aa9ff' })
    if (i > 0) specs.push({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [x, y + 1.2, z], scale: [1, 1, 1], color: '#ffd94d' })
  })
  specs.push({ kind: 'player', name: 'Spawn', gameType: 'player', pos: [0, 1.5, 10], scale: [1, 1, 1], color: '#4da3ff' })
  specs.push({ kind: 'bridge', name: 'Himmelssteg', gameType: 'static', pos: [2, 1.6, -4], scale: [1, 1, 1], color: '#c9a06a' })
  for (let i = 0; i < 6; i++) {
    specs.push({ kind: 'cloud', name: 'Wolke', gameType: 'decoration', pos: [(rng() - 0.5) * 30, -2 - rng() * 4, (rng() - 0.5) * 30], scale: [2 + rng() * 2, 2, 2 + rng() * 2], color: '#ffffff' })
  }
  for (let i = 0; i < 2; i++) {
    specs.push({ kind: 'flyer', name: `${lang === 'en' ? 'Wasp' : 'Wespe'} ${i + 1}`, gameType: 'enemy', pos: [(rng() - 0.5) * 10, 4, -4 - i * 4], scale: [1, 1, 1], color: '#b45cff', extra: { range: 4, speed: 1.2, behavior: 'fly' } })
  }
  specs.push({ kind: 'torus', name: 'Ring', gameType: 'decoration', pos: [-1, 5.5, -11], scale: [1, 1, 1], color: '#ffd94d' })
  specs.push({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [-1, 5.2, -11], scale: [1.3, 1.3, 1.3], color: '#37d67a' })
  return { specs, sky: th.sky, briefing: B(lang, 'Himmelsinseln: 5 Inseln ohne Netz — springe dich hoch, weiche 2 Wespen aus, Ziel am goldenen Ring.', 'Sky islands: 5 islands with no safety net — jump up, dodge 2 wasps, goal at the golden ring.') }
}

// Kuratierte Szenen-Bibliothek
export function libraryScenes(lang = 'de') {
  const L = (de, en) => (lang === 'en' ? en : de)
  return [
    { id: 'demo', icon: '🪙', title: L('Münz-Sammler', 'Coin Collector'), desc: L('8 Münzen, Jäger + Wächter, Zieltor', '8 coins, chasers + guards, goal gate'), make: rng => buildCollector(rng, { theme: 'forest', coins: 8, enemies: 3, lang }) },
    { id: 'maze', icon: '🧩', title: L('Mini-Labyrinth', 'Mini Maze'), desc: L('Irrgarten mit Wächter', 'Maze with a guard'), make: rng => buildMaze(rng, { theme: 'default', coins: 5, enemies: 1, lang }) },
    { id: 'parkour', icon: '🧗', title: L('Sky-Parkour', 'Sky Parkour'), desc: L('9 Plattformen bis zum Gipfel', '9 platforms to the summit'), make: rng => buildParkour(rng, { theme: 'sunset', platforms: 9, lang }) },
    { id: 'arena', icon: '🚀', title: L('Arena-Nacht', 'Arena Night'), desc: L('Drohnen + Wespen, Schießstand', 'Drones + wasps, shooting range'), make: rng => buildShooter(rng, { theme: 'space', enemies: 4, flyers: 2, coins: 4, lang }) },
    { id: 'desert', icon: '🏜️', title: L('Wüsten-Rallye', 'Desert Rally'), desc: L('Sammler im Wüstensand', 'Collector in desert sand'), make: rng => buildCollector(rng, { theme: 'desert', coins: 10, enemies: 2, lang }) },
    { id: 'snow', icon: '❄️', title: L('Schnee-Abenteuer', 'Snow Adventure'), desc: L('Parkour im Schnee', 'Parkour in the snow'), make: rng => buildParkour(rng, { theme: 'snow', platforms: 8, lang }) },
    { id: 'volcano', icon: '🌋', title: L('Vulkan-Arena', 'Volcano Arena'), desc: L('Heiße Arena mit Wespen', 'Hot arena with wasps'), make: rng => buildShooter(rng, { theme: 'volcano', enemies: 4, flyers: 3, coins: 4, lang }) },
    { id: 'tutorial', icon: '🎓', title: L('Tutorial', 'Tutorial'), desc: L('Geführt: Laufen, Springen, Fähre', 'Guided: walk, jump, ferry'), make: rng => buildTutorial(rng, { lang }) },
    { id: 'lagoon', icon: '🏝️', title: L('Lagune', 'Lagoon'), desc: L('Stege, Krabben, Torbogen', 'Jetties, crabs, stone arch'), make: rng => buildLagoon(rng, { lang }) },
    { id: 'snowvillage', icon: '🏠', title: L('Schneedorf', 'Snow Village'), desc: L('Hütten, Tannen, Wolf', 'Cabins, firs, wolf'), make: rng => buildSnowVillage(rng, { lang }) },
    { id: 'volcanopark', icon: '🌋', title: L('Vulkan-Parkour', 'Volcano Parkour'), desc: L('Lava, Fähren, Feder', 'Lava, ferries, spring'), make: rng => buildVolcanoParkour(rng, { lang }) },
    { id: 'obstacle', icon: '🏁', title: L('Hindernis-Parcours', 'Obstacle Course'), desc: L('Treppe, Stacheln, Lava-Fähre', 'Stairs, spikes, lava ferry'), make: rng => buildObstacle(rng, { lang }) },
    { id: 'sky', icon: '☁️', title: L('Himmelsinseln', 'Sky Islands'), desc: L('5 Inseln ohne Netz', '5 islands, no safety net'), make: rng => buildSkyIslands(rng, { lang }) }
  ]
}
