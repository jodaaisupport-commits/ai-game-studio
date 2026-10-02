import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { sound } from './sound.js'
import { t } from './i18n.js'

let GID = 1
const uid = () => 'o' + (GID++)

export const DEFAULT_CODE = `// Eigene Spiellogik — läuft jedes Frame in "Spielen" (Strg+Enter startet).
// api: score, lives, coinsLeft, enemiesLeft, time, players[], win(msg),
//      lose(msg), msg(t), toast(t), spawnFX(pos, farbe).
// Eigene Merker an api hängen (z. B. api._bonus) für einmalige Effekte.
//
// Rezepte zum Einkommentieren:
// 1) Zeitlimit 90 Sekunden:
// if (api.time > 90) api.lose('Zeit um!');
// 2) Tempo-Bonus: alle Münzen in unter 30 s → +5 Punkte:
// if (!api._bonus && api.time < 30 && api.coinsLeft === 0) { api._bonus = true; api.score += 5; api.msg('+5 Tempo-Bonus!'); }
// 3) Hinweis, sobald alle Gegner besiegt sind:
// if (!api._clear && api.enemiesLeft === 0) { api._clear = true; api.toast('Bereich sicher — jetzt Münzen sammeln!'); }
`

export class Studio {
  constructor(container, opts = {}) {
    this.container = container
    this.onSelect = opts.onSelect || (() => {})
    this.onChange = opts.onChange || (() => {})
    this.log = opts.log || (() => {})
    this.objects = []
    this.selected = null
    this.playing = false
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#87bfe8')
    this.scene.fog = new THREE.Fog('#87bfe8', 40, 110)
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500)
    this.camera.position.set(14, 11, 17)

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbit.target.set(0, 1, 0)
    this.orbit.enableDamping = true

    this.hemi = new THREE.HemisphereLight('#cfe8ff', '#3a5f3a', 0.9)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight('#ffffff', 2.2)
    this.sun.position.set(12, 20, 8)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -30; this.sun.shadow.camera.right = 30
    this.sun.shadow.camera.top = 30; this.sun.shadow.camera.bottom = -30
    this.scene.add(this.sun)

    this.grid = new THREE.GridHelper(60, 60, '#7c5cff', '#2a3350')
    this.grid.position.y = 0.02
    this.scene.add(this.grid)

    this.tc = new TransformControls(this.camera, this.renderer.domElement)
    this.tc.setSize(0.9)
    this.scene.add(this.tc.getHelper ? this.tc.getHelper() : this.tc)
    this.tc.addEventListener('objectChange', () => this.onChange())
    this.tc.addEventListener('mouseUp', () => this.snapshot())
    // Während Gizmo-Ziehen keine Kamera-Rotation (sonst kämpfen beide um die Maus)
    this.tc.addEventListener('dragging-changed', e => { if (!this.playing) this.orbit.enabled = !e.value })
    this.boxHelper = new THREE.BoxHelper(new THREE.Object3D(), '#7c5cff')
    this.boxHelper.visible = false
    this.scene.add(this.boxHelper)

    this.ray = new THREE.Raycaster()
    this.ptr = new THREE.Vector2()
    this.downAt = null
    this.downTime = 0
    this.renderer.domElement.addEventListener('pointerdown', e => { this.downAt = [e.clientX, e.clientY]; this.downTime = performance.now() })
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (!this.downAt) return
      const dx = e.clientX - this.downAt[0], dy = e.clientY - this.downAt[1]
      const quick = performance.now() - this.downTime < 500
      const tap = dx * dx + dy * dy < 144 && quick
      this.downAt = null
      // Im Spiel: nur bei Tap schießen (kein versehentlicher Schuss nach Kamera-Drag)
      if (this.playing) { if (tap) this.shoot(); return }
      if (!tap) return
      this.pick(e)
    })

    this.keys = {}
    addEventListener('keydown', e => { this.keys[e.code] = true; if (e.code === 'Space' && this.playing) e.preventDefault() })
    addEventListener('keyup', e => { this.keys[e.code] = false })

    // Play-Kamera
    this.yaw = Math.PI; this.pitch = 0.35
    let dragging = false, lx = 0, ly = 0
    this.renderer.domElement.addEventListener('pointermove', e => {
      if (!this.playing) return
      if (e.buttons === 1 || e.buttons === 2) {
        if (!dragging) { dragging = true; lx = e.clientX; ly = e.clientY; return }
        this.yaw -= (e.clientX - lx) * 0.005
        this.pitch = Math.max(-0.2, Math.min(1.2, this.pitch + (e.clientY - ly) * 0.004))
        lx = e.clientX; ly = e.clientY
      } else dragging = false
    })
    this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

    this.fx = []
    this.userTick = null
    this.userCode = DEFAULT_CODE
    this._last = performance.now()
    this._elapsed = 0
    // Undo/Redo
    this.history = []
    this.future = []
    this._suspend = false
    // Co-op + Touch + Tutorial
    this.coop = false
    this.touch = { x: 0, y: 0, jump: false }
    this.tutorialCheck = null
    this.onToast = null
    this.sceneTitle = 'demo'
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    this.setQuality('auto')
    this.resize()
    addEventListener('resize', () => this.resize())
    this.renderer.setAnimationLoop(() => this.frame())
    this.ready = true
    this.rendererBadge()
  }

  rendererBadge() {
    try {
      const gl = this.renderer.getContext()
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'WebGL'
      const el = document.getElementById('renderer-badge')
      if (el) el.textContent = `Renderer: ${name.slice(0, 42)}`
    } catch { /* ignore */ }
  }

  resize() {
    const w = this.container.clientWidth || 2, h = this.container.clientHeight || 2
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setQuality(q) {
    this.quality = q
    const low = q === 'low' || (q === 'auto' && this.isTouch)
    this.renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = !low
    this.sun.castShadow = !low
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true })
    this.resize()
  }

  setSky(name) {
    this.sky = name
    if (name === 'night') {
      this.scene.background = new THREE.Color('#05070f'); this.scene.fog = new THREE.Fog('#05070f', 45, 120)
      this.hemi.intensity = 0.35; this.sun.intensity = 0.7; this.sun.color.set('#9db4ff')
    } else if (name === 'sunset') {
      this.scene.background = new THREE.Color('#3a2140'); this.scene.fog = new THREE.Fog('#3a2140', 40, 110)
      this.hemi.intensity = 0.7; this.sun.intensity = 2.4; this.sun.color.set('#ffb070')
    } else if (name === 'desert') {
      this.scene.background = new THREE.Color('#ecd9a8'); this.scene.fog = new THREE.Fog('#ecd9a8', 45, 120)
      this.hemi.intensity = 1.0; this.sun.intensity = 2.8; this.sun.color.set('#fff2cc')
    } else if (name === 'snow') {
      this.scene.background = new THREE.Color('#cfe0f2'); this.scene.fog = new THREE.Fog('#cfe0f2', 40, 115)
      this.hemi.intensity = 1.1; this.sun.intensity = 1.8; this.sun.color.set('#eaf4ff')
    } else if (name === 'volcano') {
      this.scene.background = new THREE.Color('#200f0f'); this.scene.fog = new THREE.Fog('#3a1414', 35, 100)
      this.hemi.intensity = 0.5; this.sun.intensity = 1.6; this.sun.color.set('#ff6a3d')
    } else {
      this.scene.background = new THREE.Color('#87bfe8'); this.scene.fog = new THREE.Fog('#87bfe8', 40, 110)
      this.hemi.intensity = 0.9; this.sun.intensity = 2.2; this.sun.color.set('#ffffff')
    }
  }

  mat(color, emissive = '#000000', ei = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, emissive, emissiveIntensity: ei })
  }

  createMesh(spec) {
    // GLB aus dem Sitzungs-Cache (Undo/Redo, Speichern) — sonst Platzhalter
    if (spec.kind === 'deco-glb' || spec.glbRef) {
      const tpl = spec.glbRef && this.glbCache && this.glbCache[spec.glbRef]
      if (tpl) {
        const g = tpl.clone(true)
        g.position.fromArray(spec.pos || [0, 1, 0])
        if (spec.scale) g.scale.fromArray(spec.scale)
        g.userData.gid = uid()
        g.userData.name = spec.name || g.userData.name
        g.userData.basePos = [...g.position.toArray()]
        return g
      }
      this.log('GLB-Modell nicht in dieser Sitzung — Platzhalter eingefügt, bitte Datei erneut laden.')
      spec = { kind: 'box', name: (spec.name || 'GLB') + ' (erneut laden)', gameType: 'decoration', pos: spec.pos || [0, 1, 0], scale: [2, 2, 2], color: '#e08a3c' }
    }
    const g = new THREE.Group()
    const c = spec.color || '#7c5cff'
    let main = null
    let box = null, ring = null, wings = null, pulseMat = null, parts = false
    const shadowed = m => { m.castShadow = true; m.receiveShadow = true; return m }
    switch (spec.kind) {
      case 'sphere': main = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 24), this.mat(c))); break
      case 'capsule': main = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 8, 16), this.mat(c))); break
      case 'cylinder': main = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24), this.mat(c))); break
      case 'ramp': main = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2), this.mat(c))); main.rotation.x = -0.42; g.rotation.y = spec.extra?.rotY || 0; break
      case 'ground': main = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat(c)); main.receiveShadow = true; break
      case 'coin':
        main = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 28), new THREE.MeshStandardMaterial({ color: '#ffd94d', metalness: 0.85, roughness: 0.25, emissive: '#a86e00', emissiveIntensity: 0.55 }))
        main.rotation.x = Math.PI / 2; main.castShadow = true
        break
      case 'enemy': {
        main = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), this.mat(c, '#550000', 0.4)))
        main.position.y = 0.35
        const eyeG = new THREE.SphereGeometry(0.11, 12, 10)
        const eyeM = new THREE.MeshBasicMaterial({ color: '#ffffff' })
        const e1 = new THREE.Mesh(eyeG, eyeM), e2 = new THREE.Mesh(eyeG, eyeM)
        e1.position.set(-0.2, 0.5, 0.48); e2.position.set(0.2, 0.5, 0.48)
        g.add(e1, e2)
        break
      }
      case 'flyer': {
        main = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), this.mat(c, '#330066', 0.5)))
        main.position.y = 0
        const wingG = new THREE.SphereGeometry(0.3, 10, 8)
        const wingM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
        const w1 = new THREE.Mesh(wingG, wingM), w2 = new THREE.Mesh(wingG, wingM)
        w1.scale.set(1, 0.15, 0.6); w2.scale.set(1, 0.15, 0.6)
        w1.position.set(-0.5, 0.25, 0); w2.position.set(0.5, 0.25, 0)
        g.add(w1, w2); wings = [w1, w2]
        break
      }
      case 'platform': {
        main = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2, emissive: c, emissiveIntensity: 0.25 })))
        break
      }
      case 'cone': {
        main = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 20), this.mat(c)))
        main.position.y = 0.8
        box = [1.4, 1.6, 1.4]
        break
      }
      case 'torus': {
        main = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 14, 32), this.mat(c, c, 0.3)))
        main.position.y = 0.95
        box = [1.9, 1.9, 0.5]
        break
      }
      case 'stairs': {
        for (let i = 0; i < 4; i++) {
          const h = 0.35 * (i + 1)
          const st = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3, h, 1.1), this.mat(i % 2 ? c : '#ffffff', '#000000', 0)))
          if (i % 2) st.material.color.set('#ffffff')
          st.position.set(0, h / 2, 1.65 - i * 1.1)
          st.userData.size = [3, h, 1.1]
          g.add(st)
        }
        parts = true
        break
      }
      case 'bridge': {
        const deck = shadowed(new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 2), this.mat(c)))
        g.add(deck)
        for (const z of [-0.9, 0.9]) {
          const rail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.12), this.mat('#6b4a2f')))
          rail.position.set(0, 0.4, z)
          g.add(rail)
        }
        box = [6, 0.3, 2]
        break
      }
      case 'arch': {
        for (const x of [-1.6, 1.6]) {
          const pil = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.8), this.mat(c)))
          pil.position.set(x, 1.5, 0)
          pil.userData.size = [0.8, 3, 0.8]
          g.add(pil)
        }
        const beam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1), this.mat(c)))
        beam.position.set(0, 3.4, 0)
        beam.userData.size = [4, 0.8, 1]
        g.add(beam)
        parts = true
        break
      }
      case 'house': {
        const base = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.6), this.mat(c)))
        base.position.y = 1.1
        const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), this.mat('#a53f3f')))
        roof.position.y = 2.9; roof.rotation.y = Math.PI / 4
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), this.mat('#4a2f1a'))
        door.position.set(0, 0.7, 1.32)
        g.add(base, roof, door)
        box = [3, 3.6, 2.8]
        break
      }
      case 'cloud': {
        const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.92 })
        for (const [x, s] of [[-0.9, 0.8], [0, 1.2], [0.9, 0.8]]) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), cm)
          m.scale.y = 0.6; m.position.x = x
          g.add(m)
        }
        break
      }
      case 'water': {
        main = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.65, roughness: 0.15, metalness: 0.3 }))
        main.rotation.x = -Math.PI / 2
        main.receiveShadow = true
        break
      }
      case 'spikes': {
        const bs = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6), this.mat('#3a3f4a')))
        bs.position.y = 0.12
        g.add(bs)
        const sm = this.mat('#b9c2d0', '#222222', 0.2)
        for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [0, 0], [-0.45, 0.45], [0.45, 0.45]]) {
          const spike = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 10), sm))
          spike.position.set(x, 0.6, z)
          g.add(spike)
        }
        box = [1.6, 0.95, 1.6]
        break
      }
      case 'lava': {
        main = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1), new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff3d00', emissiveIntensity: 0.9, roughness: 0.6 }))
        main.position.y = 0.08
        pulseMat = main.material
        box = [1, 0.2, 1]
        break
      }
      case 'spring': {
        const bs = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.3, 18), this.mat('#3a3f4a')))
        bs.position.y = 0.15
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 18), new THREE.MeshStandardMaterial({ color: '#37d67a', emissive: '#37d67a', emissiveIntensity: 0.7, roughness: 0.4 }))
        top.position.y = 0.36
        g.add(bs, top)
        pulseMat = top.material
        box = [1.2, 0.45, 1.2]
        break
      }
      case 'heart': {
        main = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#a3002e', emissiveIntensity: 0.6, roughness: 0.3 }))
        main.castShadow = true
        break
      }
      case 'goal': {
        ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 14, 40), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.3 }))
        ring.position.y = 1.4; ring.castShadow = true
        const p1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.5, 12), this.mat('#dfe6ff')))
        const p2 = p1.clone()
        p1.position.set(-1.05, 1.25, 0); p2.position.set(1.05, 1.25, 0)
        g.add(ring, p1, p2)
        break
      }
      case 'light': {
        const l = new THREE.PointLight(c, 30, 18); l.position.y = 0.5; g.add(l)
        main = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: c }))
        break
      }
      case 'player': {
        main = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 8, 16), new THREE.MeshStandardMaterial({ color: '#4da3ff', transparent: true, opacity: 0.75, roughness: 0.4 }))
        main.position.y = 0.7
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 32), new THREE.MeshBasicMaterial({ color: '#4da3ff', side: THREE.DoubleSide }))
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring)
        break
      }
      case 'tree': {
        const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 10), this.mat('#6b4a2f')))
        trunk.position.y = 0.55
        const top = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.9, 12), this.mat(c)))
        top.position.y = 1.9
        g.add(trunk, top); main = trunk
        break
      }
      default: main = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat(c)))
    }
    if (main) g.add(main)
    g.position.fromArray(spec.pos || [0, 1, 0])
    if (spec.scale) g.scale.fromArray(spec.scale)
    g.userData = {
      gid: uid(), kind: spec.kind || 'box', name: spec.name || spec.kind,
      gameType: spec.gameType || 'static', color: c,
      basePos: [...g.position.toArray()], range: spec.extra?.range ?? 4, speed: spec.extra?.speed ?? 1.4,
      behavior: spec.extra?.behavior || (spec.kind === 'flyer' ? 'fly' : 'patrol'),
      axis: spec.extra?.axis || 'x',
      box, ring, wings, pulseMat, parts,
      phase: Math.random() * Math.PI * 2
    }
    // Boden-Geometrie liegt mit Oberkante bei y=pos? Specs nutzen pos als Mitte — für ground scale[1]=1 bei pos y=0 → Oberkante 0.5. Korrigiere: ground versenken.
    if (spec.kind === 'ground') g.position.y = -0.5
    return g
  }

  addSpec(spec) {
    this.snapshot()
    const o = this.createMesh(spec)
    this.scene.add(o); this.objects.push(o)
    this.onChange(); return o
  }

  remove(obj) {
    this.snapshot()
    this.scene.remove(obj)
    this.objects = this.objects.filter(o => o !== obj)
    if (this.selected === obj) this.select(null)
    this.onChange()
  }

  clear() {
    this.snapshot()
    for (const o of [...this.objects]) this.scene.remove(o)
    this.objects = []; this.select(null); this.onChange()
  }

  // ---- Undo / Redo ----
  snapshot() {
    if (this._suspend || this.playing) return
    this.history.push(JSON.stringify(this.serialize()))
    if (this.history.length > 60) this.history.shift()
    this.future = []
  }
  _restore(json) {
    this._suspend = true
    try { this.load(JSON.parse(json)) } finally { this._suspend = false }
  }
  undo() {
    if (!this.history.length || this.playing) return false
    this.future.push(JSON.stringify(this.serialize()))
    this._restore(this.history.pop())
    return true
  }
  redo() {
    if (!this.future.length || this.playing) return false
    this.history.push(JSON.stringify(this.serialize()))
    this._restore(this.future.pop())
    return true
  }

  select(obj) {
    this.selected = obj
    if (obj && !this.playing) { this.tc.attach(obj); this.boxHelper.setFromObject(obj); this.boxHelper.visible = true }
    else { this.tc.detach(); this.boxHelper.visible = false }
    this.onSelect(obj)
  }

  pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(this.ptr, this.camera)
    const hits = this.ray.intersectObjects(this.objects, true)
    if (!hits.length) { this.select(null); return }
    let o = hits[0].object
    while (o && !o.userData.gid) o = o.parent
    this.select(o || null)
  }

  focus(obj) {
    if (!obj) return
    const p = new THREE.Vector3(); new THREE.Box3().setFromObject(obj).getCenter(p)
    this.orbit.target.copy(p)
  }

  resetView() {
    try {
      const box = new THREE.Box3()
      let n = 0
      const tmp = new THREE.Box3()
      for (const o of this.objects) {
        if (['ground', 'cloud', 'water', 'light'].includes(o.userData.kind)) continue
        tmp.setFromObject(o)
        if (!tmp.isEmpty()) { box.union(tmp); n++ }
      }
      if (n > 0) {
        const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3())
        const r = Math.max(s.x, s.z, 10)
        this.camera.position.set(c.x + r * 0.62, c.y + r * 0.5 + 3, c.z + r * 0.78)
        this.orbit.target.set(c.x, Math.max(c.y - s.y * 0.2, 0.8), c.z)
        this.orbit.update?.()
        return
      }
    } catch { /* Fallback unten */ }
    this.camera.position.set(14, 11, 17)
    this.orbit.target.set(0, 1, 0)
    this.orbit.update?.()
  }

  serialize() {
    return {
      app: 'ai-3d-game-studio', v: 1, sky: this.sky || 'day', code: this.userCode,
      objects: this.objects.map(o => ({
        kind: o.userData.kind, name: o.userData.name, gameType: o.userData.gameType,
        pos: o.position.toArray(), scale: o.scale.toArray(), color: o.userData.color,
        glbRef: o.userData.glbRef || undefined,
        extra: { range: o.userData.range, speed: o.userData.speed, behavior: o.userData.behavior, axis: o.userData.axis }
      }))
    }
  }

  load(data) {
    this.clear()
    this.setSky(data.sky || 'day')
    this.userCode = typeof data.code === 'string' ? data.code : DEFAULT_CODE
    for (const s of data.objects || []) this.addSpec(s)
  }

  colliders() {
    const out = []
    for (const o of this.objects) {
      // Treppe/Bogen: einzelne Bauteile kollidieren (begehbar/durchquerbar)
      if (o.userData.parts) { for (const m of o.children) if (m.isMesh) out.push(m); continue }
      if ((o.userData.gameType === 'static' || o.userData.gameType === 'platform') && o.userData.kind !== 'light') out.push(o)
    }
    return out
  }
  ofType(t) { return this.objects.filter(o => o.userData.gameType === t) }

  // ---------- Play mode ----------
  makeAvatar(color) {
    const g = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 8, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }))
    body.castShadow = true; body.position.y = 0.75
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), new THREE.MeshStandardMaterial({ color: '#0b1020', roughness: 0.2, metalness: 0.6 }))
    visor.position.set(0, 1.35, 0.3)
    g.add(body, visor)
    return g
  }

  play() {
    if (!this.objects.length) {
      const m = t('msg_empty')
      this.log(m); this.toast(m)
      setTimeout(() => { if (!this.playing) this.toast(null) }, 3500)
      return false
    }
    this.playing = true
    this.select(null); this.tc.detach()
    this.orbit.enabled = false
    this._backup = JSON.stringify(this.serialize())
    const spawn = this.ofType('player')[0]
    const sp = spawn ? spawn.position.clone() : new THREE.Vector3(0, 1.5, 8)
    for (const p of this.players || []) this.scene.remove(p.mesh)
    this.players = []
    const mk = (color, dx) => {
      const mesh = this.makeAvatar(color)
      mesh.position.set(sp.x + dx, Math.max(sp.y, 1.2), sp.z)
      this.scene.add(mesh)
      return { mesh, vel: new THREE.Vector3(), grounded: false, invuln: 0 }
    }
    this.players.push(mk('#4da3ff', 0))
    if (this.coop) this.players.push(mk('#ff9f43', 1.6))
    for (const p of this.players) p.invuln = 2 // Startschutz
    this.avatar = this.players[0].mesh
    this.score = 0; this.lives = 3; this.time = 0
    this.shots = []
    this.coinsLeft = this.ofType('collectible').length
    this.coinsTotal = this.coinsLeft
    this.enemiesLeft = this.ofType('enemy').length
    this.yaw = Math.PI; this.pitch = 0.35
    this.over = null
    try { this.userTick = new Function('api', 'dt', 'objs', 'THREE', this.userCode) } catch (err) { this.log('Code-Fehler: ' + err.message); this.userTick = null }
    this.hideOverlay()
    this.toast(this.coop ? '👥 Co-op: P1 WASD+Space · P2 Pfeile+Enter' : null)
    document.getElementById('mode-badge').textContent = 'PLAY'
    document.getElementById('mode-badge').classList.add('play')
    this.log(this.coop ? 'Co-op läuft — P1: WASD+Space, P2: Pfeiltasten+Enter.' : 'Spiel läuft — WASD + Leertaste, Klicken = Schießen.')
    return true
  }

  stop() {
    this.playing = false
    this.orbit.enabled = true
    for (const p of this.players || []) this.scene.remove(p.mesh)
    this.players = []
    this.avatar = null
    for (const s of this.shots || []) this.scene.remove(s.mesh)
    this.shots = []
    for (const f of this.fx) this.scene.remove(f.mesh)
    this.fx = []
    // eingesammelte Objekte wiederherstellen: aus Backup neu aufbauen
    if (this._backup) { const b = this._backup; this._backup = null; this._suspend = true; try { this.load(JSON.parse(b)) } finally { this._suspend = false } }
    this.toast(null)
    this.score = 0; this.lives = 3; this.time = 0
    document.getElementById('mode-badge').textContent = 'EDIT'
    document.getElementById('mode-badge').classList.remove('play')
    this.hideOverlay(); this.updateHUD()
  }

  shoot(fromMesh) {
    if (!this.playing || this.over) return
    const origin = fromMesh || this.avatar
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir)
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe45e' }))
    mesh.position.copy(origin.position).add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(dir, 0.8)
    this.scene.add(mesh)
    this.shots.push({ mesh, vel: dir.multiplyScalar(26), life: 1.6 })
    sound.shoot()
  }

  spawnFX(pos, color = '#ffd94d') {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color }))
      m.position.copy(pos)
      this.scene.add(m)
      this.fx.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6), life: 0.7 })
    }
  }

  // Kollisions-Box: Einzel-Teil (size) > Gruppen-Box (box) > Welt-Skalierung
  colBox(o) {
    if (o.userData.size) {
      const p = new THREE.Vector3(); o.getWorldPosition(p)
      const ws = new THREE.Vector3(); o.getWorldScale(ws)
      const b = o.userData.size
      return { p, s: new THREE.Vector3(b[0] * ws.x, b[1] * ws.y, b[2] * ws.z) }
    }
    const b = o.userData.box
    const s = b ? new THREE.Vector3(b[0] * o.scale.x, b[1] * o.scale.y, b[2] * o.scale.z) : new THREE.Vector3()
    if (!b) o.getWorldScale(s)
    return { p: o.position, s }
  }

  groundHeight(x, z, ignoreGroundPlane = false) {
    let top = -Infinity
    for (const o of this.colliders()) {
      const kind = o.userData.kind
      if (kind === 'light') continue
      const { p, s } = this.colBox(o)
      // rotierte Rampen grob ignorieren
      const hx = (kind === 'ground' ? s.x : s.x) / 2 + 0.32
      const hz = (kind === 'ground' ? s.z : s.z) / 2 + 0.32
      if (Math.abs(x - p.x) < hx && Math.abs(z - p.z) < hz) {
        const t = kind === 'ground' ? p.y + s.y / 2 : p.y + s.y / 2
        if (t > top) top = t
      }
    }
    return top
  }

  pushOut(pos, radius = 0.42) {
    for (const o of this.colliders()) {
      if (o.userData.kind === 'ground') continue
      const { p, s } = this.colBox(o)
      const dx = pos.x - p.x, dz = pos.z - p.z
      const ox = s.x / 2 + radius - Math.abs(dx), oz = s.z / 2 + radius - Math.abs(dz)
      if (ox <= 0 || oz <= 0) continue
      const top = p.y + s.y / 2, bottom = p.y - s.y / 2
      // Treppe/Kante: Füße nah über der Oberkante → draufstellen (fängt auch schnellen Fall ab)
      if (top - pos.y <= 0.55 && top - pos.y > -0.6) { pos.y = Math.max(pos.y, top); continue }
      // Keine vertikale Überlappung mit dem Körper (Füße..Kopf) → kein Schub
      if (pos.y >= top - 0.05 || pos.y + 1.5 <= bottom + 0.1) continue
      if (ox < oz) pos.x = p.x + Math.sign(dx || 1) * (s.x / 2 + radius)
      else pos.z = p.z + Math.sign(dz || 1) * (s.z / 2 + radius)
    }
  }

  msg(t) { const el = document.getElementById('hud'); if (el) el.dataset.msg = t }
  updateHUD() {
    const el = document.getElementById('hud')
    if (!el) return
    const mm = Math.floor(this.time / 60), ss = String(Math.floor(this.time % 60)).padStart(2, '0')
    el.textContent = this.playing
      ? `🪙 ${this.coinsTotal - this.coinsLeft}/${this.coinsTotal} · 👾 ${this.enemiesLeft} · ❤️ ${this.lives} · ⏱ ${mm}:${ss}`
      : `${t('hud_score')} ${this.score || 0} · ${t('hud_objects')} ${this.objects.length}`
  }

  showOverlay(title, text) {
    document.getElementById('overlay-title').textContent = title
    document.getElementById('overlay-text').textContent = text
    document.getElementById('overlay').classList.remove('hidden')
  }
  hideOverlay() { document.getElementById('overlay').classList.add('hidden') }

  api() {
    return {
      score: this.score, lives: this.lives, coinsLeft: this.coinsLeft, enemiesLeft: this.enemiesLeft,
      time: this.time, player: this.avatar, players: (this.players || []).map(p => p.mesh), objects: this.objects,
      coop: this.coop,
      win: m => this.finish(true, m), lose: m => this.finish(false, m),
      msg: t => this.log(t), toast: m => this.toast(m), spawnFX: (p, c) => this.spawnFX(p, c)
    }
  }
  toast(msg) { if (this.onToast) this.onToast(msg) }
  bestKey() { return 'ai-studio-best::' + (this.sceneTitle || 'demo') }
  getBest() { try { return JSON.parse(localStorage.getItem(this.bestKey()) || 'null') } catch { return null } }
  finish(won, text) {
    if (this.over) return
    this.over = won ? 'won' : 'lost'
    const focus = this.avatar ? this.avatar.position.clone().add(new THREE.Vector3(0, 1, 0)) : new THREE.Vector3()
    this.spawnFX(focus, won ? '#37d67a' : '#ff5d5d')
    let extra = ''
    if (won) {
      sound.win()
      const rec = { score: this.score, time: Math.round(this.time * 10) / 10, date: new Date().toISOString().slice(0, 10) }
      const prev = this.getBest()
      if (!prev || rec.score > prev.score || (rec.score === prev.score && rec.time < prev.time)) {
        localStorage.setItem(this.bestKey(), JSON.stringify(rec))
        extra = ` 🏅 ${t('best')}!`
      } else extra = ` (${t('best')}: ${prev.score} P, ${prev.time}s)`
    } else sound.lose()
    const def = won ? `Zeit: ${this.time.toFixed(1)}s, ${this.score} Punkte!${extra}` : t('try_again')
    this.showOverlay(won ? t('won') : t('lost'), (text || def))
    this.updateHUD()
    this.log(((won ? t('won') : t('lost')) + ' ' + (text || '')).trim())
  }

  frame() {
    const now = performance.now()
    const dt = Math.min((now - this._last) / 1000, 0.05)
    this._last = now
    this._elapsed += dt
    // Deko-Animation (immer)
    const t = this._elapsed
    for (const o of this.objects) {
      if (o.userData.gameType === 'collectible' || o.userData.gameType === 'powerup') { o.rotation.y += dt * 2.2; o.position.y = o.userData.basePos?.[1] ? o.userData.basePos[1] + Math.sin(t * 3 + o.userData.phase) * 0.12 : o.position.y }
      if (o.userData.ring) o.userData.ring.rotation.z += dt * 0.8
      if (o.userData.pulseMat) o.userData.pulseMat.emissiveIntensity = 0.6 + Math.sin(t * 5 + o.userData.phase) * 0.4
      if (!this.playing && o.userData.gameType === 'enemy') {
        if (o.userData.behavior === 'fly') {
          o.position.y = (o.userData.basePos[1] ?? 3) + Math.sin(t * 2 + o.userData.phase) * 0.3
          if (o.userData.wings) { const w = Math.sin(t * 20) * 0.5; o.userData.wings[0].rotation.z = w; o.userData.wings[1].rotation.z = -w }
        } else if (o.userData.behavior !== 'chase') {
          o.position.x = o.userData.basePos[0] + Math.sin(t * o.userData.speed + o.userData.phase) * o.userData.range * 0.4
        }
      }
    }
    if (this.playing && !this.over) this.tickPlay(dt)
    if (this.playing) {
      for (const f of [...this.fx]) {
        f.life -= dt; f.vel.y -= 12 * dt
        f.mesh.position.addScaledVector(f.vel, dt)
        f.mesh.rotation.x += dt * 5
        if (f.life <= 0) { this.scene.remove(f.mesh); this.fx.splice(this.fx.indexOf(f), 1) }
      }
    }
    this.orbit.update?.()
    if (this.selected && !this.playing && this.boxHelper.visible) this.boxHelper.setFromObject(this.selected)
    this.renderer.render(this.scene, this.camera)
  }

  tickPlay(dt) {
    this.time += dt
    const k = this.keys
    // Bewegliche Plattformen (mitnehmen, wer draufsteht)
    const platDelta = []
    for (const pl of this.ofType('platform')) {
      const ax = pl.userData.axis || 'x'
      const base = pl.userData.basePos
      const cur = (ax === 'z' ? base[2] : base[0]) + Math.sin(this.time * (pl.userData.speed || 1) + pl.userData.phase) * (pl.userData.range || 3)
      const old = ax === 'z' ? pl.position.z : pl.position.x
      if (ax === 'z') pl.position.z = cur; else pl.position.x = cur
      platDelta.push({ pl, dx: pl.position.x - (ax === 'x' ? old : pl.position.x), dz: pl.position.z - (ax === 'z' ? old : pl.position.z) })
    }
    const ride = p => {
      for (const { pl, dx, dz } of platDelta) {
        const { s } = this.colBox(pl)
        const top = pl.position.y + s.y / 2
        if (Math.abs(p.mesh.position.x - pl.position.x) < s.x / 2 + 0.2 &&
            Math.abs(p.mesh.position.z - pl.position.z) < s.z / 2 + 0.2 &&
            Math.abs(p.mesh.position.y - top) < 0.35) {
          p.mesh.position.x += dx; p.mesh.position.z += dz
        }
      }
    }
    // --- Spieler (P1 + optional P2) ---
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      if (p.invuln > 0) p.invuln -= dt
      let f = 0, s = 0, jump = false
      if (i === 0) {
        f = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0)
        s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0)
        if (!this.coop) { f += (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0); s += (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0) }
        jump = !!(k.Space || this.touch.jump)
        this.touch.jump = false
      } else {
        f = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0)
        s = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)
        jump = !!k.Enter
      }
      const sp = 7.5
      const dir = new THREE.Vector3(Math.sin(this.yaw) * f + Math.cos(this.yaw) * s, 0, Math.cos(this.yaw) * f - Math.sin(this.yaw) * s)
      if (i === 0 && (this.touch.x || this.touch.y)) {
        dir.x += Math.cos(this.yaw) * this.touch.x + Math.sin(this.yaw) * this.touch.y
        dir.z += -Math.sin(this.yaw) * this.touch.x + Math.cos(this.yaw) * this.touch.y
      }
      if (dir.lengthSq() > 0) dir.normalize()
      p.mesh.position.addScaledVector(dir, sp * dt)
      if (dir.lengthSq() > 0) p.mesh.rotation.y = Math.atan2(dir.x, dir.z)
      this.pushOut(p.mesh.position)
      p.mesh.position.x = Math.max(-28, Math.min(28, p.mesh.position.x))
      p.mesh.position.z = Math.max(-28, Math.min(28, p.mesh.position.z))
      ride(p)
      p.vel.y -= 24 * dt
      if (jump && p.grounded) { p.vel.y = 9; p.grounded = false; sound.jump() }
      p.mesh.position.y += p.vel.y * dt
      const floor = this.groundHeight(p.mesh.position.x, p.mesh.position.z)
      if (p.mesh.position.y <= floor + 0.05) { p.mesh.position.y = floor + 0.05; p.vel.y = 0; p.grounded = true }
      else if (p.mesh.position.y > floor + 0.15) p.grounded = false
      if (p.mesh.position.y < -12) {
        if (this.coop && this.lives > 1) {
          this.lives--
          const sp0 = this.ofType('player')[0]
          p.mesh.position.set(sp0 ? sp0.position.x : 0, 2, sp0 ? sp0.position.z : 8)
          p.vel.set(0, 0, 0); p.invuln = 2
          this.log(`Abgrund! Noch ${this.lives} Leben.`)
          sound.hit()
        } else { this.finish(false, 'Abgrund!'); return }
      }
      p.moved = p.moved || dir.lengthSq() > 0
    }
    // --- Gegner ---
    for (const e of this.ofType('enemy')) {
      const beh = e.userData.behavior || 'patrol'
      if (beh === 'chase') {
        let best = null, bd = 1e9
        for (const p of this.players) { const d = e.position.distanceTo(p.mesh.position); if (d < bd) { bd = d; best = p } }
        if (best && bd < 14) {
          const d = new THREE.Vector3().subVectors(best.mesh.position, e.position); d.y = 0
          if (d.length() > 0.6) { d.normalize(); e.position.addScaledVector(d, e.userData.speed * 1.3 * dt); e.rotation.y = Math.atan2(d.x, d.z) }
        }
        e.position.y = e.userData.basePos[1] || 0.8
      } else if (beh === 'fly') {
        e.position.x = e.userData.basePos[0] + Math.sin(this.time * e.userData.speed + e.userData.phase) * e.userData.range
        e.position.z = (e.userData.basePos[2] || 0) + Math.cos(this.time * e.userData.speed * 0.7 + e.userData.phase) * e.userData.range * 0.5
        e.position.y = (e.userData.basePos[1] ?? 3) + Math.sin(this.time * 2 + e.userData.phase) * 0.4
        if (e.userData.wings) { const w = Math.sin(this.time * 30) * 0.5; e.userData.wings[0].rotation.z = w; e.userData.wings[1].rotation.z = -w }
      } else {
        e.position.x = e.userData.basePos[0] + Math.sin(this.time * e.userData.speed + e.userData.phase) * e.userData.range
      }
      for (const p of this.players) {
        const head = p.mesh.position.clone().add(new THREE.Vector3(0, 1, 0))
        const ec = e.position.clone(); ec.y += e.userData.kind === 'flyer' ? 0 : 0.4
        if (head.distanceTo(ec) < 1.35 && p.invuln <= 0) {
          this.lives--; p.invuln = 1.2
          this.spawnFX(head, '#ff5d5d')
          this.log(`Aua! Noch ${this.lives} Leben.`)
          sound.hit()
          if (this.lives <= 0) { this.finish(false, 'Keine Leben mehr!'); return }
        }
      }
    }
    // Fallen (Stacheln, Lava) — Box-Überlappung mit dem Spielerkörper
    for (const h of this.objects.filter(o => o.userData.gameType === 'hazard')) {
      const { p: hp, s: hs } = this.colBox(h)
      for (const p of this.players) {
        const pp = p.mesh.position
        if (Math.abs(pp.x - hp.x) < hs.x / 2 + 0.35 && Math.abs(pp.z - hp.z) < hs.z / 2 + 0.35 &&
            pp.y < hp.y + hs.y / 2 + 0.6 && pp.y > hp.y - 1.2 && p.invuln <= 0) {
          this.lives--; p.invuln = 1.2
          this.spawnFX(pp.clone().add(new THREE.Vector3(0, 1, 0)), '#ff5d5d')
          this.log(`Aua! Noch ${this.lives} Leben.`)
          sound.hit()
          if (this.lives <= 0) { this.finish(false, 'Keine Leben mehr!'); return }
        }
      }
    }
    // Sprungfedern katapultieren nach oben
    for (const f of this.objects.filter(o => o.userData.gameType === 'spring')) {
      const { p: qp, s: qs } = this.colBox(f)
      for (const p of this.players) {
        const pp = p.mesh.position
        if (Math.abs(pp.x - qp.x) < qs.x / 2 + 0.4 && Math.abs(pp.z - qp.z) < qs.z / 2 + 0.4 &&
            Math.abs(pp.y - (qp.y + qs.y / 2)) < 0.55 && p.vel.y <= 0.5) {
          p.vel.y = 14; p.grounded = false
          this.spawnFX(pp.clone().add(new THREE.Vector3(0, 0.5, 0)), '#37d67a')
          sound.jump()
        }
      }
    }
    // Münzen (jeder Spieler kann sammeln)
    for (const c of [...this.ofType('collectible')]) {
      for (const p of this.players) {
        const d = p.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)).distanceTo(c.position)
        if (d < 1.4) {
          this.spawnFX(c.position.clone(), '#ffd94d')
          this.scene.remove(c); this.objects = this.objects.filter(o => o !== c)
          this.coinsLeft--; this.score++
          this.log(`Münze! (${this.score}/${this.coinsTotal})`)
          sound.coin()
          break
        }
      }
    }
    // Power-ups (Herzen: +1 Leben, max. 5)
    for (const u of [...this.objects.filter(o => o.userData.gameType === 'powerup')]) {
      for (const p of this.players) {
        const d = p.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)).distanceTo(u.position)
        if (d < 1.4) {
          this.spawnFX(u.position.clone(), '#ff4d6d')
          this.scene.remove(u); this.objects = this.objects.filter(o => o !== u)
          this.lives = Math.min(5, this.lives + 1); this.score++
          this.log(`❤️ +1 Leben! (${this.lives})`)
          sound.coin()
          break
        }
      }
    }
    // Projektile
    for (const sh of [...this.shots]) {
      sh.life -= dt
      sh.mesh.position.addScaledVector(sh.vel, dt)
      let hit = false
      for (const e of [...this.ofType('enemy')]) {
        const ec = e.position.clone(); ec.y += e.userData.kind === 'flyer' ? 0 : 0.4
        if (sh.mesh.position.distanceTo(ec) < 1.0) {
          this.spawnFX(ec, '#ff7ab8')
          this.scene.remove(e); this.objects = this.objects.filter(o => o !== e)
          this.enemiesLeft--; this.score += 2; hit = true
          this.log('Treffer! +2 Punkte.')
          sound.hit()
          break
        }
      }
      if (hit || sh.life <= 0 || sh.mesh.position.length() > 60) {
        this.scene.remove(sh.mesh); this.shots.splice(this.shots.indexOf(sh), 1)
      }
    }
    // Ziel
    for (const g of this.ofType('goal')) {
      for (const p of this.players) {
        if (p.mesh.position.distanceTo(g.position) < 2.0 && this.coinsLeft <= 0 && this.enemiesLeft <= 0) {
          this.finish(true, `Alle Ziele erreicht in ${this.time.toFixed(1)}s, ${this.score} Punkte!`)
          return
        }
      }
    }
    // Tutorial-Fortschritt + Custom-Code (score/lives aus dem Code werden übernommen)
    if (this.tutorialCheck) { try { this.tutorialCheck(this.api(), dt) } catch (err) { this.log('Tutorial-Fehler: ' + err.message); this.tutorialCheck = null } }
    if (this.userTick) {
      try {
        const a = this.api()
        this.userTick(a, dt, this.objects, THREE)
        if (Number.isFinite(a.score)) this.score = a.score
        if (Number.isFinite(a.lives)) this.lives = Math.max(0, Math.round(a.lives))
        if (this.lives <= 0) { this.finish(false, 'Keine Leben mehr!'); return }
      } catch (err) { this.log('Code-Fehler: ' + err.message); this.userTick = null }
    }
    // Kamera folgt Mittelpunkt aller Spieler
    const mid = new THREE.Vector3()
    for (const p of this.players) mid.add(p.mesh.position)
    mid.divideScalar(this.players.length)
    let spread = 0
    for (const p of this.players) spread = Math.max(spread, mid.distanceTo(p.mesh.position))
    const cd = 7.5 + spread * 0.7
    const cx = mid.x - Math.sin(this.yaw) * Math.cos(this.pitch) * cd
    const cz = mid.z - Math.cos(this.yaw) * Math.cos(this.pitch) * cd
    const cy = mid.y + 2 + Math.sin(this.pitch) * cd
    this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.pow(0.0001, dt))
    this.camera.lookAt(mid.x, mid.y + 1.4, mid.z)
    this.updateHUD()
  }

  async loadGLB(file) {
    const buf = await file.arrayBuffer()
    const loader = new GLTFLoader()
    const gltf = await new Promise((res, rej) => loader.parse(buf, '', res, rej))
    const root = gltf.scene || gltf.scenes?.[0]
    if (!root) throw new Error('Kein 3D-Inhalt gefunden')
    // Auf handhabbare Größe normieren (längste Seite → 3 Einheiten), Boden auf y=0.5
    const bb = new THREE.Box3().setFromObject(root)
    const size = bb.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    root.scale.multiplyScalar(3 / maxDim)
    const bb2 = new THREE.Box3().setFromObject(root)
    root.position.set(0, 0.5 - bb2.min.y, 0)
    root.traverse(m => { if (m.isMesh) { m.castShadow = true } })
    const gid = uid()
    root.userData = { gid, glbRef: gid, kind: 'deco-glb', name: file.name.replace(/\.(glb|gltf)$/i, ''), gameType: 'decoration', color: '#9aa7c2', basePos: [...root.position.toArray()], range: 0, speed: 0, behavior: 'patrol', axis: 'x', box: null, ring: null, wings: null, pulseMat: null, parts: false, phase: 0 }
    this.snapshot()
    this.glbCache = this.glbCache || {}
    this.glbCache[gid] = root.clone(true)
    this.scene.add(root); this.objects.push(root)
    this.select(root); this.onChange()
  }
}
