// KI-Schicht: lokaler Heuristik-Generator + optionale Zen-API (OpenAI-kompatibel).
import { buildCollector, buildMaze, buildParkour, buildShooter, hashSeed, mulberry32, themeColors } from './templates.js'

export function detectTheme(p) {
  if (/space|weltraum|nacht|stern|galax|dunkel|neon|cyber/.test(p)) return 'space'
  if (/vulkan|volcano|lava|magma/.test(p)) return 'volcano'
  if (/wüste|desert|sand|düne|oase/.test(p)) return 'desert'
  if (/lagune|lagoon|wasser|strand|beach|insel|island/.test(p)) return 'lagoon'
  if (/schnee|snow|winter|eis|frost/.test(p)) return 'snow'
  if (/sunset|sonnenuntergang/.test(p)) return 'sunset'
  if (/wald|park|natur|dschungel|insel/.test(p)) return 'forest'
  return 'default'
}
export function detectTemplate(p) {
  if (/labyrinth|maze|irrgarten|rätsel/.test(p)) return 'maze'
  if (/parkour|jump|sprung|plattform|sky|himmel|gipfel|tower|turm/.test(p)) return 'parkour'
  if (/shoot|schie|arena|kampf|drohne|baller|action|gegner\s*(besieg|abschie)/.test(p)) return 'shooter'
  return 'collector'
}
function numNear(p, words, fallback) {
  const m = p.match(new RegExp(`(\\d+)\\s*(?:${words})`))
  if (m) return Math.max(1, Math.min(24, parseInt(m[1], 10)))
  const m2 = p.match(new RegExp(`(?:${words})[^\\d]{0,12}(\\d+)`))
  if (m2) return Math.max(1, Math.min(24, parseInt(m2[1], 10)))
  return fallback
}

export function generateLocal(prompt, lang = 'de') {
  const p = (prompt || '').toLowerCase()
  const template = detectTemplate(p)
  const theme = detectTheme(p)
  const rng = mulberry32(hashSeed(prompt + '::' + template))
  const coins = numNear(p, 'münzen?|coins?|sterne?', template === 'collector' ? 8 : 5)
  const enemies = numNear(p, 'gegner|feinde|drohnen|monster|wächter|enem(?:y|ies)|drones?', template === 'collector' ? 2 : template === 'shooter' ? 5 : template === 'maze' ? 1 : 0)
  const builders = { collector: buildCollector, maze: buildMaze, parkour: buildParkour, shooter: buildShooter }
  const res = builders[template](rng, { theme, coins, enemies, platforms: numNear(p, 'plattformen|stufen|level|platforms?', 9), lang })
  const th = themeColors(theme)
  return { template, theme, sky: res.sky || th.sky, specs: res.specs, briefing: res.briefing, title: `„${(prompt || 'Spiel').slice(0, 60)}“ → ${template}` }
}

// ---- Zen-API (opencode.ai, OpenAI-kompatibel, kostenlose Modelle) ----
const BASE = 'https://opencode.ai/zen/v1'
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer public',
  'User-Agent': 'opencode/1.15.9 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14',
  'X-Opencode-Client': 'cli',
  'X-Opencode-Project': 'global'
}
export async function listZenModels() {
  try {
    const r = await fetch(`${BASE}/models`, { headers: HEADERS })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    const ids = (j.data || []).map(m => m.id)
    const free = ids.filter(id => /free/i.test(id))
    return { all: ids, free: free.length ? free : ids.slice(0, 12) }
  } catch (e) {
    // Browser-CORS-Fallback: ohne Custom-Header versuchen (kann je nach Server klappen)
    const r = await fetch(`${BASE}/models`)
    if (!r.ok) throw e
    const j = await r.json()
    const ids = (j.data || []).map(m => m.id)
    const free = ids.filter(id => /free/i.test(id))
    return { all: ids, free: free.length ? free : ids.slice(0, 12) }
  }
}
const SCHEMA_HINT = `Antworte NUR mit JSON (kein Markdown außen, notfalls in \`\`\`json). Schema:
{"sky":"day|sunset|night|desert|snow|volcano","briefing":"kurz","objects":[{"kind":"box|sphere|capsule|cylinder|ramp|stairs|bridge|arch|house|cone|torus|cloud|water|ground|coin|enemy|flyer|goal|light|player|tree|platform|spring|spikes|lava|heart","name":"...","gameType":"static|platform|hazard|spring|powerup|player|collectible|enemy|goal|decoration","pos":[x,y,z],"scale":[x,y,z],"color":"#rrggbb","extra":{"range":4,"speed":1.5,"behavior":"patrol|chase|fly","axis":"x"}}]}
Regeln: genau 1x kind=ground (scale [60,1,60]), genau 1x kind=player als Spawn, 3-12 Münzen/coins, 0-6 Gegner/enemy, 1x goal, Treppen/Brücken/Häuser als Deko-Wege, Stacheln/Lava sparsam als Fallen, 0-1 Federn/spring, 0-1 Herzen/heart. Koordinaten in [-14,14], y>=0.5.`
export async function generateViaZen(prompt, model) {
  const body = {
    model, stream: false,
    messages: [
      { role: 'system', content: `Du bist ein 3D-Spiele-Designer für ein Three.js-Studio. ${SCHEMA_HINT}` },
      { role: 'user', content: `Entwerfe ein spielbares 3D-Minispiel für diese Idee (deutsch): ${prompt}` }
    ]
  }
  const r = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Zen-API: HTTP ${r.status}`)
  const j = await r.json()
  const text = j.choices?.[0]?.message?.content || ''
  const m = text.match(/```json([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('KI-Antwort enthielt kein JSON.')
  const data = JSON.parse(m[1] ?? m[0])
  if (!Array.isArray(data.objects)) throw new Error('KI-JSON ohne objects[].')
  const specs = data.objects.map((o, i) => ({
    kind: o.kind || 'box', name: o.name || `Objekt ${i + 1}`,
    gameType: o.gameType || (o.kind === 'coin' ? 'collectible' : o.kind === 'enemy' ? 'enemy' : o.kind === 'goal' ? 'goal' : o.kind === 'player' ? 'player' : 'static'),
    pos: Array.isArray(o.pos) ? o.pos : [0, 1, 0],
    scale: Array.isArray(o.scale) ? o.scale : [1, 1, 1],
    color: typeof o.color === 'string' ? o.color : '#7c5cff',
    extra: o.extra || {}
  }))
  return { template: 'zen', theme: 'custom', sky: data.sky || 'day', specs, briefing: data.briefing || 'KI-Szene geladen.' }
}
