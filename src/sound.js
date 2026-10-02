// Minimaler WebAudio-Soundtrack: keine Assets, alles synthetisiert.
let ctx = null
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
function tone(freq, dur = 0.12, type = 'sine', vol = 0.18, slide = 0) {
  const c = ac(), t = c.currentTime
  const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t); o.stop(t + dur + 0.02)
}
export const sound = {
  enabled: localStorage.getItem('ai-studio-sound') !== 'off',
  toggle() { this.enabled = !this.enabled; localStorage.setItem('ai-studio-sound', this.enabled ? 'on' : 'off'); return this.enabled },
  safe(fn) { if (!this.enabled) return; try { fn() } catch { /* kein Audio (z. B. Headless) */ } },
  click() { this.safe(() => tone(660, 0.06, 'square', 0.08)) },
  coin() { this.safe(() => { tone(880, 0.09, 'sine', 0.2); setTimeout(() => tone(1320, 0.14, 'sine', 0.2), 70) }) },
  jump() { this.safe(() => tone(300, 0.15, 'sine', 0.12, 350)) },
  shoot() { this.safe(() => tone(1200, 0.08, 'sawtooth', 0.1, -700)) },
  hit() { this.safe(() => tone(160, 0.25, 'sawtooth', 0.2, -80)) },
  win() { this.safe(() => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.2), i * 110)) }) },
  lose() { this.safe(() => { [400, 320, 240, 160].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.14), i * 130)) }) }
}
