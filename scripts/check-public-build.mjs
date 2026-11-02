import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = new URL('../dist/', import.meta.url)
const files = await readdir(dist, { recursive: true, withFileTypes: true })
assert.ok(files.some((file) => file.name === 'index.html'), '缺少網站入口')
for (const file of files.filter((entry) => entry.isFile())) {
  const fullPath = path.join(file.parentPath, file.name)
  assert.doesNotMatch(fullPath, /[/\\](docs|tests|__tests__|scripts|\.github)[/\\]|\.(pdf|md|ts|tsx|map)$/i, '建置不可包含內部文件、測試、PDF、原始碼或source map')
  assert.doesNotMatch(file.name, /(?:^|[.\-_])(test|spec)(?:[.\-_]|$)/i, '建置不可包含測試檔')
  if (/\.(html|js|css|json|txt)$/i.test(file.name)) {
    const text = await readFile(fullPath, 'utf8')
    assert.doesNotMatch(text, /SRC-\d{3}|印刷頁碼|印刷第|技術依據與注意事項|technicalEvidence|measureReviews|reviewStatus|壓縮空氣供氣系統節能手冊|商業冷凍冷藏.*Q&A|C:[/\\]Users[/\\]|\.pdf/i, '建置包含內部文獻或審核資料')
  }
}

// 以實際產物核對Pages子路徑與本機檔案，不僅檢查設定文字。
const base = '/energy-saving-advisor/'
async function checkAsset(reference, from = `${base}index.html`) {
  if (/^(?:data:|https?:|#|\/\/)/i.test(reference)) return
  const target = new URL(reference, `https://eevan-h.github.io${from}`)
  assert.ok(target.pathname.startsWith(base), `資源未使用Pages base：${reference}`)
  const relative = decodeURIComponent(target.pathname.slice(base.length))
  assert.ok(relative && !relative.split('/').includes('..'), `不合法的資源路徑：${reference}`)
  await access(new URL(relative, dist))
}
const html = await readFile(new URL('index.html', dist), 'utf8')
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1])
assert.ok(references.some((ref) => ref.endsWith('.js')), 'HTML缺少JavaScript入口')
assert.ok(references.some((ref) => ref.endsWith('.css')), 'HTML缺少CSS入口')
for (const ref of references) {
  assert.ok(ref.startsWith(base), `HTML資源base不正確：${ref}`)
  await checkAsset(ref)
}
for (const file of files.filter((entry) => entry.isFile() && /\.(css|js)$/i.test(entry.name))) {
  const fullPath = path.join(file.parentPath, file.name)
  const publicPath = `${base}${path.relative(fileURLToPath(dist), fullPath).replaceAll('\\', '/')}`
  const text = await readFile(fullPath, 'utf8')
  const refs = file.name.endsWith('.css')
    ? [...text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)].map((match) => match[1])
    : [...text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+\.(?:js|css))["']/g)].map((match) => match[1])
  for (const ref of refs) await checkAsset(ref, publicPath)
}
console.log(`公開建置檢查通過：無內部文件、測試或PDF；HTML／CSS／JS資源符合 ${base} 且檔案存在。`)
