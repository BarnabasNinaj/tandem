import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public')

const mark = `
  <path d="M18 40c6-14 10-22 14-22s8 8 14 22" stroke="#ecfdf5" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="22" r="3.5" fill="#99f6e4"/>
`

/** Rounded tile — matches favicon / “any” purpose icons. */
function anySvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#0f766e"/>
  ${mark}
</svg>`
}

/** Full-bleed for Apple (iOS applies its own mask). */
function appleSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" fill="#0f766e"/>
  ${mark}
</svg>`
}

/** Maskable: full-bleed + ~72% scale so the mark stays in the safe zone. */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" fill="#0f766e"/>
  <g transform="translate(32 32) scale(0.72) translate(-32 -32)">
    ${mark}
  </g>
</svg>`
}

function render(svg, filename) {
  const size = Number(/width="(\d+)"/.exec(svg)[1])
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  const out = path.join(outDir, filename)
  fs.writeFileSync(out, resvg.render().asPng())
  console.log(`${filename} (${size}×${size}) → ${fs.statSync(out).size} bytes`)
}

render(anySvg(192), 'pwa-192.png')
render(anySvg(512), 'pwa-512.png')
render(maskableSvg(512), 'pwa-512-maskable.png')
render(appleSvg(180), 'apple-touch-icon.png')
