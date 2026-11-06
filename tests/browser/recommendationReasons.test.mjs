import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { recommend } from '../../src/lib/recommendations.ts'
import { defaultQuestions } from '../../src/data/questions.ts'

const require = createRequire(process.env.ENERGY_PLAYWRIGHT_ROOT
  ? path.join(process.env.ENERGY_PLAYWRIGHT_ROOT, 'package.json') : import.meta.url)
const { chromium } = require('playwright')
const baseURL = process.env.ENERGY_TEST_URL ?? 'http://127.0.0.1:5175/energy-saving-advisor/'
const answers = { monthlyBill: '3001～10000元', equipment: ['空調', '照明', '冷凍冷藏', '空壓'], operatingHours: '超過12小時', equipmentAge: '超過10年', priority: '設備耗電量高' }
const expected = recommend('factory', answers)
const baselineHeights = { 320: 13896, 390: 12351, 1280: 8459 }
const safety = {
  空調: '用電設備請依原廠指引使用，電氣維修請交由專業人員，勿自行拆修。',
  照明: '用電設備請依原廠指引使用，電氣維修請交由專業人員，勿自行拆修。',
  冷凍冷藏: '食品安全優先，勿自行更改除霜或安全保護設定；冷媒、電氣與壓力系統維修請交由專業人員。',
  空壓: '勿拆卸帶壓管路；調壓或停供前，請專業人員確認製程與安全需求。',
}

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`推薦原因獨立及全部展開、原文排序與安全提醒 ${viewport.width}px`, async () => {
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
      for (const [index, question] of defaultQuestions.entries()) {
        const answer = answers[question.id]
        for (const option of Array.isArray(answer) ? answer : [answer]) await page.getByLabel(option, { exact: true }).check()
        await page.getByRole('button', { name: index === 4 ? '查看回答摘要' : '下一步', exact: true }).click()
      }
      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      const cards = page.locator('main > section > ol > li')
      const details = cards.locator('details')
      const summaries = details.locator('summary')
      const expandAll = page.getByRole('button', { name: '展開全部推薦原因', exact: true })
      const collapseAll = page.getByRole('button', { name: '收合全部推薦原因', exact: true })

      async function assertOpen(indexes) {
        const states = await details.evaluateAll((elements) => elements.map((element) => element.open))
        assert.deepEqual(states, expected.map((_, index) => indexes.includes(index)))
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        assert.deepEqual(await cards.locator('h3').allTextContents(), expected.map(({ measure }) => measure.name))
        assert.doesNotMatch(await page.locator('main').textContent(), /SRC-\d|PDF|印刷第|規則匹配分數|規則版本|[ABC][類級]/)
        for (const [index, { measure }] of expected.entries()) {
          const card = cards.nth(index)
          assert.equal(await card.locator('details ul').isVisible(), indexes.includes(index))
          assert.ok(await card.getByRole('heading', { name: '具體建議', exact: true }).isVisible())
          if (safety[measure.category]) {
            assert.ok(await card.locator(':scope > p').isVisible())
            assert.equal(await card.locator(':scope > p').textContent(), safety[measure.category])
          }
        }
      }

      assert.equal(await cards.count(), 13)
      await assertOpen([])
      const collapsedHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      assert.ok(collapsedHeight < baselineHeights[viewport.width])
      for (const [index, { measure, rank, priority, reasons }] of expected.entries()) {
        const card = cards.nth(index)
        assert.equal(await card.locator(':scope > div > span').textContent(), `第 ${rank} 順位 · ${priority}`)
        assert.deepEqual(await card.locator('dl dd').allTextContents(), [measure.difficulty, measure.investment])
        assert.deepEqual(await card.locator(':scope > ul > li').allTextContents(), [...measure.suggestions])
        const expectedReasons = reasons.filter((reason) => reason.showInReasons).map((reason) => {
          const evidence = reason.evidence.map(({ field, answer }) => `${defaultQuestions.find((question) => question.id === field).title}：「${answer}」`).join('；')
          return (evidence ? `${evidence}。` : '') + reason.explanation
        })
        assert.deepEqual(await card.locator('details ul > li').allTextContents(), expectedReasons)
        assert.deepEqual(await card.evaluate((element) => [...element.children].map((child) => child.tagName)), [
          'DIV', 'H3', 'DL', 'H4', 'UL', ...(safety[measure.category] ? ['P'] : []), 'DETAILS',
        ])
        assert.equal(await card.locator('summary').textContent(), '為什麼推薦這項措施？')
        const bounds = await card.locator('summary').boundingBox()
        assert.ok(bounds.height >= 48 && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width)
      }

      // 由既有 main 焦點依序 Tab：修改回答、展開全部、收合全部、首張 summary。
      for (let count = 0; count < 4; count++) await page.keyboard.press('Tab')
      assert.equal(await summaries.nth(0).evaluate((element) => element === document.activeElement), true)
      assert.equal(await summaries.nth(0).evaluate((element) => element.matches(':focus-visible')), true)
      assert.ok(await summaries.nth(0).evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth) >= 2))
      await page.keyboard.press('Enter')
      await assertOpen([0])
      await page.keyboard.press('Space')
      await assertOpen([])
      if (viewport.width < 640) await summaries.nth(1).tap()
      else await summaries.nth(1).click()
      await assertOpen([1])

      const all = expected.map((_, index) => index)
      await expandAll.press('Enter')
      await assertOpen(all)
      const expandedHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      assert.ok(expandedHeight > collapsedHeight)
      await summaries.nth(2).click()
      await assertOpen(all.filter((index) => index !== 2))
      await expandAll.click()
      await assertOpen(all)
      await collapseAll.press('Space')
      await assertOpen([])
      await summaries.nth(12).press('Enter')
      await assertOpen([12])
      await collapseAll.click()
      await assertOpen([])
      // 已全收合時重按亦不影響狀態，且仍可獨立展開。
      await collapseAll.click()
      await summaries.nth(0).click()
      await assertOpen([0])
      await collapseAll.click()
      console.log(`推薦頁高度 ${JSON.stringify({ width: viewport.width, before: baselineHeights[viewport.width], collapsed: collapsedHeight, expanded: expandedHeight })}`)
      if (process.env.ENERGY_BROWSER_ARTIFACTS) {
        await mkdir(process.env.ENERGY_BROWSER_ARTIFACTS, { recursive: true })
        await cards.nth(0).screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `recommendation-collapsed-${viewport.width}.png`) })
        await summaries.nth(0).click()
        await cards.nth(0).screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `recommendation-expanded-${viewport.width}.png`) })
      }

      // 返回摘要再查看，所有原因回到預設收合，不沿用已離開頁面的展開狀態。
      await page.getByRole('button', { name: '修改回答', exact: true }).click()
      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      await assertOpen([])
      assert.deepEqual(errors, [])
    } finally {
      await browser.close()
    }
  })
}
