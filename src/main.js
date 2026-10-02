import { Studio, DEFAULT_CODE } from './studio.js'
import { generateLocal, listZenModels, generateViaZen } from './ai.js'
import { TEMPLATES, mulberry32, hashSeed, libraryScenes } from './templates.js'
import { sound } from './sound.js'
import { t, setLang, getLang } from './i18n.js'

const $ = id => document.getElementById(id)
const logEl = $('log')
function log(msg) {
  const tstr = new Date().toLocaleTimeString(getLang() === 'en' ? 'en-US' : 'de-DE')
  logEl.textContent = `${tstr} — ${msg}`
  console.log('[studio]', msg)
}

const studio = new Studio($('viewport'), {
  log,
  onSelect: refreshInspector,
  onChange: () => { refreshHierarchy(); refreshInspector(); studio.updateHUD() }
})
studio.setSky('day')
setLang(getLang())
$('btn-lang').textContent = getLang() === 'de' ? 'EN' : 'DE'
if (!sound.enabled) $('btn-sound').textContent = '🔇'

// ---------- Tabs ----------
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'))
  b.classList.add('active')
  document.querySelectorAll('.tabpage').forEach(p => p.classList.add('hidden'))
  $('tab-' + b.dataset.tab).classList.remove('hidden')
  sound.click()
}))

// ---------- Sprache ----------
$('btn-lang').addEventListener('click', () => {
  const l = setLang(getLang() === 'de' ? 'en' : 'de')
  $('btn-lang').textContent = l === 'de' ? 'EN' : 'DE'
  renderLibrary()
  $('ai-status').textContent = t('ai_ready')
  refreshBest()
  log(l === 'de' ? 'Sprache: Deutsch.' : 'Language: English.')
})

// ---------- Sound ----------
$('btn-sound').addEventListener('click', () => {
  $('btn-sound').textContent = sound.toggle() ? '🔊' : '🔇'
})

// ---------- Undo / Redo ----------
function afterHistory() { $('code-editor').value = studio.userCode; refreshHierarchy(); refreshInspector() }
$('btn-undo').addEventListener('click', () => { if (studio.undo()) { afterHistory(); log('↩') } })
$('btn-redo').addEventListener('click', () => { if (studio.redo()) { afterHistory(); log('↪') } })
addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); if (studio.undo()) afterHistory() }
  if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) { e.preventDefault(); if (studio.redo()) afterHistory() }
})

// ---------- Hierarchie ----------
function refreshHierarchy() {
  const h = $('hierarchy'); h.innerHTML = ''
  $('obj-count').textContent = studio.objects.length
  $('scene-title').textContent = studio.sceneTitle || ''
  const tags = { static: 'statisch', platform: '🛟', player: 'Spawn', collectible: '🪙', enemy: '👾', goal: '🏁', decoration: 'deko', hazard: '⚠️', spring: '🌀', powerup: '❤️' }
  for (const o of studio.objects) {
    const d = document.createElement('div')
    d.className = 'item' + (studio.selected === o ? ' sel' : '')
    d.innerHTML = `<span>${escapeHtml(o.userData.name)}</span><span class="tag">${tags[o.userData.gameType] || o.userData.kind}</span>`
    d.onclick = () => studio.select(o)
    d.ondblclick = () => studio.focus(o)
    h.appendChild(d)
  }
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

// ---------- Bibliothek + Vorlagen (sprachabhängig gerendert) ----------
function renderLibrary() {
  const lib = libraryScenes(getLang())
  const mk = (el, items) => {
    el.innerHTML = ''
    for (const item of items) {
      const b = document.createElement('button')
      b.innerHTML = `<b>${item.icon} ${escapeHtml(item.title)}</b><span>${escapeHtml(item.desc)}</span>`
      b.onclick = () => {
        const rng = mulberry32(hashSeed(item.id + Date.now() % 100000))
        applyResult({ ...item.make(rng), sceneId: item.id }, getLang() === 'en' ? 'library' : 'Bibliothek')
        sound.click()
      }
      el.appendChild(b)
    }
  }
  mk($('library'), lib)
  mk($('templates'), lib.slice(0, 4))
}
function refreshBest() {
  const b = studio.getBest()
  $('best-line').classList.toggle('hidden', !b)
  if (b) $('best-line').textContent = `${t('best')}: ${b.score} P · ${b.time}s · ${b.date}`
}

// ---------- Hinzufügen ----------
const ADD_SPECS = {
  box: () => ({ kind: 'box', name: 'Würfel', gameType: 'static', pos: [rand6(), 1, rand6()], scale: [2, 2, 2], color: '#8a6b4a' }),
  sphere: () => ({ kind: 'sphere', name: 'Kugel', gameType: 'static', pos: [rand6(), 1.2, rand6()], scale: [1.5, 1.5, 1.5], color: '#5aa9ff' }),
  capsule: () => ({ kind: 'capsule', name: 'Kapsel', gameType: 'static', pos: [rand6(), 1.4, rand6()], scale: [1, 1, 1], color: '#7c5cff' }),
  cylinder: () => ({ kind: 'cylinder', name: 'Säule', gameType: 'static', pos: [rand6(), 1.5, rand6()], scale: [1.4, 3, 1.4], color: '#9aa7c2' }),
  ramp: () => ({ kind: 'ramp', name: 'Rampe', gameType: 'static', pos: [rand6(), 0.6, rand6()], scale: [1, 1, 1], color: '#ffb020' }),
  stairs: () => ({ kind: 'stairs', name: 'Treppe', gameType: 'static', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#8a6b4a' }),
  bridge: () => ({ kind: 'bridge', name: 'Brücke', gameType: 'static', pos: [rand6(), 1, rand6()], scale: [1, 1, 1], color: '#8a6b4a' }),
  arch: () => ({ kind: 'arch', name: 'Bogen', gameType: 'static', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#d9c9a8' }),
  house: () => ({ kind: 'house', name: 'Haus', gameType: 'static', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#7a5a3a' }),
  cone: () => ({ kind: 'cone', name: 'Kegel', gameType: 'static', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#c46a4a' }),
  torus: () => ({ kind: 'torus', name: 'Ring', gameType: 'static', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#7c5cff' }),
  cloud: () => ({ kind: 'cloud', name: 'Wolke', gameType: 'decoration', pos: [rand6(), 8, rand6()], scale: [2, 2, 2], color: '#ffffff' }),
  water: () => ({ kind: 'water', name: 'Wasser', gameType: 'decoration', pos: [rand6(), 0.55, rand6()], scale: [6, 1, 5], color: '#2fa8c7' }),
  platform: () => ({ kind: 'platform', name: 'Plattform', gameType: 'platform', pos: [rand6(), 1, rand6()], scale: [3, 0.4, 3], color: '#4da3ff', extra: { axis: 'x', range: 3, speed: 1 } }),
  spring: () => ({ kind: 'spring', name: 'Feder', gameType: 'spring', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#37d67a' }),
  spikes: () => ({ kind: 'spikes', name: 'Stacheln', gameType: 'hazard', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#b9c2d0' }),
  lava: () => ({ kind: 'lava', name: 'Lava', gameType: 'hazard', pos: [rand6(), 0, rand6()], scale: [4, 1, 3], color: '#ff5a1e' }),
  heart: () => ({ kind: 'heart', name: 'Herz', gameType: 'powerup', pos: [rand6(), 1.2, rand6()], scale: [1, 1, 1], color: '#ff4d6d' }),
  ground: () => ({ kind: 'ground', name: 'Boden', gameType: 'static', pos: [0, 0, 0], scale: [60, 1, 60], color: '#3f9e57' }),
  coin: () => ({ kind: 'coin', name: 'Münze', gameType: 'collectible', pos: [rand6(), 1.2, rand6()], scale: [1, 1, 1], color: '#ffd94d' }),
  enemy: () => ({ kind: 'enemy', name: 'Gegner', gameType: 'enemy', pos: [rand6(), 0.8, rand6()], scale: [1, 1, 1], color: '#ff4d5e', extra: { behavior: 'chase' } }),
  flyer: () => ({ kind: 'flyer', name: 'Flieger', gameType: 'enemy', pos: [rand6(), 3.2, rand6()], scale: [1, 1, 1], color: '#b45cff', extra: { behavior: 'fly' } }),
  goal: () => ({ kind: 'goal', name: 'Ziel', gameType: 'goal', pos: [0, 1.2, -8], scale: [1.4, 1.4, 1.4], color: '#37d67a' }),
  light: () => ({ kind: 'light', name: 'Licht', gameType: 'decoration', pos: [rand6(), 3, rand6()], scale: [1, 1, 1], color: '#ffe9a3' }),
  player: () => ({ kind: 'player', name: 'Spawn', gameType: 'player', pos: [0, 1.5, 8], scale: [1, 1, 1], color: '#4da3ff' }),
  tree: () => ({ kind: 'tree', name: 'Baum', gameType: 'decoration', pos: [rand6(), 0, rand6()], scale: [1, 1, 1], color: '#2e9e57' })
}
const rand6 = () => Math.round((Math.random() * 12 - 6) * 2) / 2
document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
  const o = studio.addSpec(ADD_SPECS[b.dataset.add]())
  studio.select(o); sound.click()
}))

// ---------- Tools ----------
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-tool]').forEach(x => x.classList.remove('active'))
  b.classList.add('active'); studio.tc.setMode(b.dataset.tool); sound.click()
}))
$('chk-grid').addEventListener('change', e => {
  studio.grid.visible = e.target.checked
})
$('chk-snap').addEventListener('change', e => {
  studio.tc.setTranslationSnap(e.target.checked ? 0.5 : null)
  studio.tc.setRotationSnap(e.target.checked ? Math.PI / 12 : null)
})
$('chk-coop').addEventListener('change', e => { studio.coop = e.target.checked })
$('sel-quality').addEventListener('change', e => studio.setQuality(e.target.value))
studio.tc.setTranslationSnap(0.5); studio.tc.setRotationSnap(Math.PI / 12)
// Doppelklick/Doppeltipp fokussiert
studio.renderer.domElement.addEventListener('dblclick', () => studio.focus(studio.selected))

// ---------- Inspektor ----------
function refreshInspector() {
  const o = studio.selected
  $('insp-empty').classList.toggle('hidden', !!o)
  $('insp-body').classList.toggle('hidden', !o)
  if (!o) return
  // Das gerade bearbeitete Feld nicht überschreiben (z. B. beim Gizmo-Ziehen)
  const set = (id, v) => { const el = $(id); if (el !== document.activeElement) el.value = v }
  set('insp-name', o.userData.name)
  set('insp-type', o.userData.gameType)
  set('insp-behavior', o.userData.behavior || 'patrol')
  $('insp-behavior-wrap').style.display = o.userData.gameType === 'enemy' ? '' : 'none'
  const p = o.position
  set('insp-px', p.x.toFixed(1)); set('insp-py', p.y.toFixed(1)); set('insp-pz', p.z.toFixed(1))
  set('insp-sx', o.scale.x.toFixed(2)); set('insp-sy', o.scale.y.toFixed(2)); set('insp-sz', o.scale.z.toFixed(2))
  set('insp-color', /^#[0-9a-f]{6}$/i.test(o.userData.color) ? o.userData.color : '#7c5cff')
}
for (const [id, fn] of [
  ['insp-name', v => { studio.snapshot(); studio.selected.userData.name = v; refreshHierarchy() }],
  ['insp-type', v => { studio.snapshot(); studio.selected.userData.gameType = v; studio.selected.userData.basePos = [...studio.selected.position.toArray()]; refreshHierarchy(); refreshInspector() }],
  ['insp-behavior', v => { studio.snapshot(); studio.selected.userData.behavior = v }]
]) $(id).addEventListener('change', e => { if (studio.selected) fn(e.target.value) })
for (const [id, axis] of [['insp-px', 'x'], ['insp-py', 'y'], ['insp-pz', 'z']])
  $(id).addEventListener('change', e => {
    if (!studio.selected) return
    studio.snapshot()
    studio.selected.position[axis] = parseFloat(e.target.value) || 0
    studio.selected.userData.basePos = [...studio.selected.position.toArray()]
  })
for (const [id, axis] of [['insp-sx', 'x'], ['insp-sy', 'y'], ['insp-sz', 'z']])
  $(id).addEventListener('change', e => {
    if (!studio.selected) return
    studio.snapshot()
    studio.selected.scale[axis] = Math.max(0.1, parseFloat(e.target.value) || 1)
  })
$('insp-color').addEventListener('focus', () => studio.snapshot())
$('insp-color').addEventListener('input', e => {
  const o = studio.selected; if (!o) return
  o.userData.color = e.target.value
  o.traverse(m => { if (m.isMesh && m.material && m.material.color && !o.userData.ring) { if (o.userData.gameType !== 'collectible' && o.userData.kind !== 'coin') m.material.color.set(e.target.value) } })
})
function dupSelected() {
  const o = studio.selected; if (!o) return
  const d = studio.serialize().objects.find(x => x.name === o.userData.name)
  if (d) { d.pos = [d.pos[0] + 1.5, d.pos[1], d.pos[2] + 1.5]; d.name += getLang() === 'en' ? ' copy' : ' Kopie'; studio.select(studio.addSpec(d)) }
}
$('btn-dup').addEventListener('click', dupSelected)
$('btn-del').addEventListener('click', () => { if (studio.selected) studio.remove(studio.selected) })
$('btn-focus').addEventListener('click', () => studio.focus(studio.selected))
$('env-sky').addEventListener('change', e => studio.setSky(e.target.value))
addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && studio.selected && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') studio.remove(studio.selected)
})
// Shortcuts: F = fokussieren, Strg+D = duplizieren, Esc = Auswahl aufheben, Strg+Enter = spielen
addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
    if (!typing) { e.preventDefault(); dupSelected() }
    return
  }
  if (typing || studio.playing) return
  if (e.code === 'Escape') studio.select(null)
  else if (e.code === 'KeyF' && studio.selected) studio.focus(studio.selected)
  else if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') $('btn-play').click()
})

// ---------- Toast ----------
studio.onToast = msg => {
  const el = $('toast')
  if (!msg) { el.classList.add('hidden'); return }
  el.textContent = msg; el.classList.remove('hidden')
}

// ---------- Play ----------
$('btn-play').addEventListener('click', () => {
  studio.userCode = $('code-editor').value
  setupTutorial(studio.tutorialScene)
  if (studio.play()) {
    $('btn-play').disabled = true; $('btn-stop').disabled = false
    if (studio.isTouch) $('touch-ui').classList.remove('hidden')
  }
})
function stopPlay() {
  studio.stop(); studio.tutorialCheck = null
  studio.resetView()
  $('btn-play').disabled = false; $('btn-stop').disabled = true
  $('touch-ui').classList.add('hidden')
  refreshHierarchy(); refreshInspector()
}
$('btn-stop').addEventListener('click', stopPlay)
$('btn-again').addEventListener('click', () => { stopPlay(); $('btn-play').click() })

// ---------- Tutorial-Schritte ----------
function setupTutorial(isTut) {
  studio.tutorialCheck = null
  if (!isTut) return
  let step = 0, start = null
  studio.toast(t('tut_move'))
  studio.tutorialCheck = api => {
    const p = api.players[0]
    if (!p) return
    if (!start) start = p.position.clone()
    if (step === 0 && p.position.distanceTo(start) > 1.2) { step = 1; studio.toast(t('tut_jump')) }
    else if (step === 1 && p.position.y > start.y + 0.6) { step = 2; studio.toast(t('tut_coin')) }
    else if (step === 2 && api.score > 0) { step = 3; studio.toast(t('tut_goal')) }
  }
}

// ---------- Code ----------
$('code-editor').value = DEFAULT_CODE
$('code-editor').addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault()
    e.target.setRangeText('  ', e.target.selectionStart, e.target.selectionEnd, 'end')
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('btn-code-run').click() }
})
$('btn-code-run').addEventListener('click', () => $('btn-play').click())
$('btn-code-reset').addEventListener('click', () => { $('code-editor').value = DEFAULT_CODE; studio.userCode = DEFAULT_CODE })

// ---------- Save / Export / Import / GLB ----------
$('btn-save').addEventListener('click', () => {
  localStorage.setItem('ai-studio-scene', JSON.stringify({ ...studio.serialize(), title: studio.sceneTitle }))
  log(getLang() === 'en' ? 'Scene saved in browser.' : 'Szene im Browser gespeichert.')
})
$('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ ...studio.serialize(), title: studio.sceneTitle }, null, 2)], { type: 'application/json' })
  const slug = (studio.sceneTitle || 'szene').toLowerCase().replace(/[^a-z0-9äöü]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30) || 'szene'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
})
$('btn-import').addEventListener('click', () => $('file-import').click())
$('file-import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return
  try {
    const data = JSON.parse(await f.text())
    studio.sceneTitle = data.title || f.name
    studio.tutorialScene = false
    studio.load(data); $('code-editor').value = studio.userCode; $('env-sky').value = studio.sky || 'day'
    studio.resetView(); refreshBest()
  } catch (err) { log('Import-Fehler: ' + err.message) }
  e.target.value = ''
})
$('btn-glb').addEventListener('click', () => $('file-glb').click())
$('file-glb').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return
  try { await studio.loadGLB(f) } catch (err) { log('GLB-Fehler: ' + err.message) }
  e.target.value = ''
})
$('btn-clear').addEventListener('click', () => studio.clear())

// ---------- Touch-Steuerung ----------
function setupTouch() {
  const stick = $('stick'), knob = $('stick-knob')
  let active = null, cx = 0, cy = 0
  const R = 40
  stick.addEventListener('pointerdown', e => { active = e.pointerId; stick.setPointerCapture(active); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; e.preventDefault() })
  stick.addEventListener('pointermove', e => {
    if (e.pointerId !== active) return
    let dx = e.clientX - cx, dy = e.clientY - cy
    const len = Math.hypot(dx, dy) || 1, cl = Math.min(len, R)
    dx = dx / len * cl; dy = dy / len * cl
    knob.style.left = (34 + dx) + 'px'; knob.style.top = (34 + dy) + 'px'
    studio.touch.x = dx / R; studio.touch.y = -dy / R
  })
  const end = e => {
    if (e.pointerId !== active) return
    active = null; studio.touch.x = 0; studio.touch.y = 0
    knob.style.left = '34px'; knob.style.top = '34px'
  }
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end)
  $('tbtn-jump').addEventListener('pointerdown', e => { e.preventDefault(); studio.touch.jump = true })
  $('tbtn-shoot').addEventListener('pointerdown', e => { e.preventDefault(); studio.shoot(studio.avatar) })
  // Wischen auf dem Viewport dreht die Kamera (Ein-Finger, wenn kein Joystick)
  let lx = 0, ly = 0, swiping = false
  const cv = studio.renderer.domElement
  cv.addEventListener('touchstart', e => { if (e.touches.length === 1 && studio.playing) { lx = e.touches[0].clientX; ly = e.touches[0].clientY; swiping = true } }, { passive: true })
  cv.addEventListener('touchmove', e => {
    if (!swiping || !studio.playing) return
    const tch = e.touches[0]
    studio.yaw -= (tch.clientX - lx) * 0.008
    studio.pitch = Math.max(-0.2, Math.min(1.2, studio.pitch + (tch.clientY - ly) * 0.006))
    lx = tch.clientX; ly = tch.clientY
  }, { passive: true })
  cv.addEventListener('touchend', () => { swiping = false })
}
setupTouch()

// ---------- KI ----------
async function refreshZenModels() {
  try {
    const { free } = await listZenModels()
    $('zen-model').innerHTML = free.map(m => `<option>${m}</option>`).join('')
    $('ai-status').textContent = `${free.length} kostenlose Modelle verfügbar.`
  } catch { $('ai-status').textContent = getLang() === 'en' ? 'Zen API blocked in browser (CORS) — use local mode, it is instantly playable.' : 'Zen-API im Browser blockiert (CORS) — nutze den lokalen Modus, der ist sofort spielbar.' }
}
$('btn-zen-refresh').addEventListener('click', refreshZenModels)

function applyResult(res, via) {
  studio.sceneTitle = res.sceneId || res.template || 'ki'
  studio.load({ sky: res.sky, code: studio.userCode, objects: res.specs })
  studio.tutorialScene = !!res.tutorial
  studio.resetView()
  $('env-sky').value = res.sky || 'day'
  $('ai-status').textContent = `✅ [${via}] ${res.briefing}\n${res.specs.length} Objekte · Himmel: ${res.sky}`
  refreshBest()
}
$('btn-ai').addEventListener('click', async () => {
  const prompt = $('ai-prompt').value.trim() || 'Münz-Sammler'
  const mode = $('ai-mode').value
  $('ai-status').textContent = '⏳ …'
  try {
    if (mode === 'zen') {
      const model = $('zen-model').value || 'mimo-v2.5-free'
      const res = await generateViaZen(prompt, model)
      applyResult(res, 'Zen ' + model)
    } else {
      await new Promise(r => setTimeout(r, 60))
      applyResult(generateLocal(prompt, getLang()), getLang() === 'en' ? 'local' : 'lokal')
    }
  } catch (err) {
    applyResult(generateLocal(prompt, getLang()), 'lokal (Fallback)')
  }
})
// (Vorlagen werden in renderLibrary() aus libraryScenes() erzeugt)

// ---------- Start ----------
function loadDemo() {
  const rng = mulberry32(hashSeed('demo'))
  const res = TEMPLATES.collector(rng, { theme: 'forest', coins: 8, enemies: 2, lang: getLang() })
  studio.sceneTitle = 'demo'
  studio.tutorialScene = false
  studio.load({ sky: res.sky, code: DEFAULT_CODE, objects: res.specs })
  studio.resetView()
  $('code-editor').value = DEFAULT_CODE
}
$('btn-demo').addEventListener('click', () => { loadDemo(); sound.click() })
renderLibrary()
try {
  const saved = localStorage.getItem('ai-studio-scene')
  if (saved) {
    const data = JSON.parse(saved)
    studio.sceneTitle = data.title || 'saved'
    studio.load(data)
    $('code-editor').value = studio.userCode; $('env-sky').value = studio.sky || 'day'
  } else loadDemo()
} catch { loadDemo() }
studio.history = []; studio.future = [] // kein Undo vor den Startzustand
refreshHierarchy(); refreshInspector(); refreshBest(); studio.updateHUD()
studio.resize()
setTimeout(() => studio.resize(), 100)
// Einmaliger Starthinweis (verschwindet beim Spielen)
if (!localStorage.getItem('ai-studio-scene')) studio.toast(t('hint_play'))
// PWA: Service Worker registrieren
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
// Marker für automatische Tests: echtes WebGL-Rendering läuft
window.__studio = studio
document.body.dataset.ready = 'ready'
