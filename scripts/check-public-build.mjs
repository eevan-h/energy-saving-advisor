import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const dist = new URL('../dist/', import.meta.url)
const files = await readdir(dist, { recursive: true, withFileTypes: true })
assert.ok(files.some((file) => file.name === 'index.html'), '缺少網站入口')
for (const file of files.filter((entry) => entry.isFile())) {
  const fullPath = path.join(file.parentPath, file.name)
  assert.doesNotMatch(fullPath, /[/\\]docs[/\\]|\.(pdf|md|ts|tsx|map)$/i, '建置不可包含內部文件、PDF、原始碼或source map')
  if (/\.(html|js|css|json|txt)$/i.test(file.name)) {
    const text = await readFile(fullPath, 'utf8')
    assert.doesNotMatch(text, /SRC-\d{3}|印刷頁碼|印刷第|技術依據與注意事項|technicalEvidence|measureReviews|reviewStatus|壓縮空氣供氣系統節能手冊|商業冷凍冷藏.*Q&A|C:[/\\]Users[/\\]|\.pdf/i, '建置包含內部文獻或審核資料')
  }
}
console.log('公開建置檢查通過：無內部文獻、審核資料、PDF或原始碼。')
