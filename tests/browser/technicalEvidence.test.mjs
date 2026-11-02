import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

// 可使用專案安裝的playwright，或指定已提供的套件目錄；不下載瀏覽器。
const require = createRequire(process.env.ENERGY_PLAYWRIGHT_ROOT
  ? path.join(process.env.ENERGY_PLAYWRIGHT_ROOT, 'package.json') : import.meta.url)
const { chromium } = require('playwright')
const baseURL = process.env.ENERGY_TEST_URL ?? 'http://127.0.0.1:5175/'

const forbidden = /技術依據與注意事項|SRC-\d{3}|PDF|印刷第|支持程度|審核狀態|核對日期|資料來源|規則匹配分數|規則版本|壓縮空氣供氣系統節能手冊|商業冷凍冷藏.*Q&A/

test('公開建置排除內部資料及原始PDF，預覽不能下載內部文件', async () => {
  await import('../../scripts/check-public-build.mjs')
  for (const file of ['docs/energy-measures-review.md', 'docs/energy-sources-register.md', 'src/data/technicalEvidence.ts', 'src/data/measureReviews.ts', 'docs/12.商業冷凍冷藏系統Q&A節能技術手冊.pdf', 'docs/2.壓縮空氣系統節能技術手冊.pdf', 'docs/10.能源查核與節約能源案例手冊-壓縮空氣系統20180628.pdf']) {
    const response = await fetch(new URL(file, baseURL))
    assert.doesNotMatch(response.headers.get('content-type') ?? '', /application\/pdf/)
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.notEqual(bytes.subarray(0, 5).toString(), '%PDF-')
    const text = bytes.toString('utf8')
    assert.doesNotMatch(text, /SRC-\d{3}|export (const|type)|# 節能措施資料審核表/)
  }
})

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`一般用戶結果只呈現改善內容，保留安全提醒及返回修改 ${viewport.width}px`, async () => {
    const browser = await chromium.launch({ channel: process.env.ENERGY_BROWSER_CHANNEL ?? 'chrome', headless: true })
    try {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 640, hasTouch: viewport.width < 640 })
      const page = await context.newPage()
      page.setDefaultTimeout(8000)
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(baseURL)
      await page.getByRole('button', { name: '開始節能評估' }).click()
      await page.getByText('小型工廠', { exact: true }).click()
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      const answers = [['3001～10000元'], ['空調', '照明', '冷凍冷藏', '空壓'], ['超過12小時'], ['超過10年'], ['設備耗電量高']]
      for (const [index, options] of answers.entries()) {
        for (const option of options) await page.getByLabel(option, { exact: true }).check()
        await page.getByRole('button', { name: index === 4 ? '查看回答摘要' : '下一步', exact: true }).click()
      }
      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      await page.getByRole('heading', { name: '節能改善措施推薦', exact: true }).waitFor()
      const results = page.locator('main > section > ol > li')
      assert.equal(await results.count(), 13)

      assert.doesNotMatch(await page.locator('main').textContent(), forbidden)
      assert.equal(await page.locator('main details').count(), 0)
      assert.equal(await page.locator('a[href$=".pdf"]').count(), 0)
      assert.ok(await page.getByText(/以下為初步改善建議/).isVisible())
      for (const item of await results.all()) {
        assert.ok(await item.getByRole('heading', { name: '為什麼推薦給你', exact: true }).isVisible())
        assert.ok(await item.getByRole('heading', { name: '具體建議', exact: true }).isVisible())
        assert.ok(await item.getByText('改善難易度', { exact: true }).isVisible())
        assert.ok(await item.getByText('設備投資需求', { exact: true }).isVisible())
        assert.match(await item.innerText(), /第 \d+ 順位/)
      }
      const refrigeration = results.filter({ has: page.getByRole('heading', { name: '冷凍冷藏溫度與開門管理', exact: true }) })
      assert.match(await refrigeration.innerText(), /隨手關妥/)
      assert.match(await refrigeration.innerText(), /不得為節能任意停機或提高保存溫度/)
      assert.match(await refrigeration.innerText(), /食品安全優先/)
      const air = results.filter({ has: page.getByRole('heading', { name: '空壓系統洩漏與保養檢查', exact: true }) })
      assert.match(await air.innerText(), /勿拆卸帶壓管路/)
      assert.match(await air.innerText(), /製程與安全需求/)
      const lighting = results.filter({ has: page.getByRole('heading', { name: '照明盤點與老舊燈具檢查', exact: true }) })
      assert.match(await lighting.innerText(), /電氣維修請交由專業人員/)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
      if (process.env.ENERGY_BROWSER_ARTIFACTS) {
        await mkdir(process.env.ENERGY_BROWSER_ARTIFACTS, { recursive: true })
        await refrigeration.screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `public-result-${viewport.width}.png`) })
      }
      await page.getByRole('button', { name: '返回回答摘要／修改答案' }).click()
      assert.ok(await page.getByRole('heading', { name: '用電狀況回答摘要' }).isVisible())
      assert.ok(await page.getByText('空調、照明、冷凍冷藏、空壓', { exact: true }).isVisible())
      await page.getByRole('button', { name: '修改主要用電設備', exact: true }).click()
      for (const option of ['空調', '照明', '冷凍冷藏', '空壓']) await page.getByLabel(option, { exact: true }).uncheck()
      assert.ok(await page.getByRole('button', { name: '下一步', exact: true }).isDisabled())
      await page.getByLabel('其他', { exact: true }).check()
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步', exact: true }).click()
      await page.getByRole('button', { name: '查看回答摘要', exact: true }).click()
      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      assert.equal(await page.locator('main > section > ol > li').count(), 1)
      assert.ok(await page.getByRole('heading', { name: '建立電費與設備用電紀錄', exact: true }).isVisible())
      assert.doesNotMatch(await page.locator('main').textContent(), forbidden)
      assert.deepEqual(errors, [])
    } finally { await browser.close() }
  })
}
