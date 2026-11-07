import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// Ejecutar después de: npm run build -- --manifest
const root = resolve('dist')
const manifest = JSON.parse(readFileSync(resolve(root, '.vite/manifest.json'), 'utf8'))
const entry = Object.keys(manifest).find(key => manifest[key].isEntry)
if (!entry) throw new Error('No se encontró la entrada del build.')

function closure(...keys) {
  const files = new Set()
  const visited = new Set()
  function visit(key) {
    if (visited.has(key)) return
    visited.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error('Referencia ausente del manifiesto: ' + key)
    if (chunk.file.endsWith('.js')) files.add(chunk.file)
    for (const dependency of chunk.imports ?? []) visit(dependency)
  }
  keys.forEach(visit)
  let bytes = 0, gzipBytes = 0
  for (const file of files) {
    const contents = readFileSync(resolve(root, file))
    bytes += contents.length
    gzipBytes += gzipSync(contents).length
  }
  return { files: files.size, kB: +(bytes / 1000).toFixed(2), gzipKB: +(gzipBytes / 1000).toFixed(2) }
}

const pages = Object.keys(manifest).filter(key => manifest[key].isDynamicEntry && /Page\.tsx$/.test(key))
console.log(JSON.stringify({
  initialStaticJS: closure(entry),
  firstVisitByPage: Object.fromEntries(pages.map(page => [page, closure(entry, page)])),
  totalJS: { kB: +([...new Set(Object.values(manifest).map(chunk => chunk.file))].filter(file => file.endsWith('.js')).reduce((sum, file) => sum + readFileSync(resolve(root, file)).length, 0) / 1000).toFixed(2) },
}, null, 2))
