// Erzeugt dist/precache.json mit allen statischen Dateien für den SW-Precache.
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../dist/', import.meta.url).pathname
const files = []
const walk = dir => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) { walk(p); continue }
    if (/\.(map|DS_Store)$/.test(e)) continue
    files.push('/' + p.slice(dist.length))
  }
}
walk(dist)
files.sort()
writeFileSync(join(dist, 'precache.json'), JSON.stringify({ v: 2, files }))
console.log('precache.json:', files.length, 'Dateien')
