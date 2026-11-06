import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { defaultQuestions } from '../../src/data/questions.ts'

const require = createRequire(process.env.ENERGY_PLAYWRIGHT_ROOT
  ? path.join(process.env.ENERGY_PLAYWRIGHT_ROOT, 'package.json') : import.meta.url)
const { chromium } = require('playwright')
const baseURL = process.env.ENERGY_TEST_URL ?? 'http://127.0.0.1:5175/energy-saving-advisor/'

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`階段標題、切題單一焦點及摘要返回 ${viewport.width}px`, async () => {
    const browser = await chromium.launch({ channel: process.env.ENERGY_BROWSER_CHANNEL ?? 'chrome', headless: true })
    try {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 640, hasTouch: viewport.width < 640 })
      const page = await context.newPage()
      page.setDefaultTimeout(8000)
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => {
        window.focusTargets = []
        document.addEventListener('focusin', ({ target }) => {
          if (['H1', 'LEGEND', 'MAIN'].includes(target.tagName)) window.focusTargets.push(target.tagName)
        })
      })
      const next = page.getByRole('button', { name: '下一步', exact: true })
      const back = page.getByRole('button', { name: '上一步', exact: true })
      const skip = page.getByRole('link', { name: '跳至主要內容', exact: true })
      const question = page.locator('main form legend')
      const expected = ['零售商店', '3001～10000元', '空調、照明、冷凍冷藏、空壓', '超過12小時', '超過10年', '設備耗電量高']

      async function assertFocused(target) {
        assert.equal(await target.evaluate((element) => element === document.activeElement), true)
        assert.equal(await target.getAttribute('tabindex'), '-1')
        assert.equal(await page.locator('main h1').count(), 1)
        assert.equal(await page.locator('[tabindex]').evaluateAll((elements) => elements.some((element) => element.tabIndex > 0)), false)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }
      async function navigate(action, target, title, tag) {
        await page.evaluate(() => { window.focusTargets = [] })
        await action()
        await target.waitFor()
        await assertFocused(target)
        assert.equal(await page.title(), `${title}｜節能改善指南`)
        assert.equal(await page.evaluate(() => window.scrollY), 0)
        // 一次導覽只聚焦一個目標，沒有 main／h1／legend 互相覆蓋。
        assert.deepEqual(await page.evaluate(() => window.focusTargets), [tag])
      }
      async function navigateQuestion(action, index, editing = false) {
        const title = `第 ${index + 1} 題：${defaultQuestions[index].title}`
        await navigate(action, question, `${editing ? '正在修改' : ''}${title}`, 'LEGEND')
        assert.equal(await question.textContent(), title)
        assert.equal(await page.getByRole('group', { name: title, exact: true }).count(), 1)
        assert.equal(await question.getAttribute('aria-live'), null)
        assert.equal(await question.getAttribute('aria-label'), null)
        assert.equal(await page.locator('[role="alert"]').count(), 0)
        const bounds = await question.boundingBox()
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height)
      }
      async function assertSkip(nextTarget) {
        const title = await page.title()
        await skip.focus()
        await page.keyboard.press('Enter')
        await assertFocused(page.locator('main'))
        assert.equal(await page.title(), title)
        await page.keyboard.press('Tab')
        assert.equal(await nextTarget.evaluate((element) => element === document.activeElement), true)
      }
      async function assertSummary() {
        assert.deepEqual(await page.locator('main dl dd > span').allTextContents(), expected)
        assert.equal(await page.title(), '用電狀況回答摘要｜節能改善指南')
      }

      await page.goto(baseURL)
      assert.equal(await page.title(), '中小微能源用戶互動式節能改善指南')
      assert.deepEqual(await page.evaluate(() => window.focusTargets), [])
      // 初載第一個 Tab 就能使用跳至主要內容，不會先被程式聚焦搶走。
      await page.keyboard.press('Tab')
      assert.equal(await skip.evaluate((element) => element === document.activeElement), true)
      await page.keyboard.press('Enter')
      await assertFocused(page.locator('main'))
      await page.keyboard.press('Tab')
      const start = page.getByRole('button', { name: '開始節能評估' })
      assert.equal(await start.evaluate((element) => element === document.activeElement), true)
      const location = page.getByRole('heading', { name: '選擇營業場所類型', level: 1, exact: true })
      await navigate(() => page.keyboard.press('Enter'), location, '選擇營業場所類型', 'H1')
      assert.equal(await page.locator('main fieldset legend h1').count(), 1)
      await assertSkip(page.getByRole('radio').first())
      await page.keyboard.press('Space')
      await page.keyboard.press('ArrowDown')
      assert.ok(await page.getByRole('radio', { name: /^零售商店/ }).isChecked())
      await page.keyboard.press('Tab')
      assert.equal(await back.evaluate((element) => element === document.activeElement), true)
      await page.keyboard.press('Tab')
      assert.equal(await next.evaluate((element) => element === document.activeElement), true)
      await navigateQuestion(() => page.keyboard.press('Enter'), 0)
      await assertSkip(page.getByRole('radio').first())
      await page.keyboard.press('Space')
      await page.keyboard.press('ArrowDown')
      assert.ok(await page.getByLabel('3001～10000元', { exact: true }).isChecked())
      await navigateQuestion(() => next.press('Enter'), 1)
      // checkbox 以 Tab／空白鍵逐項操作；作答不會把焦點拉回 legend。
      for (const equipment of ['空調', '照明', '冷凍冷藏', '空壓']) {
        await page.keyboard.press('Tab')
        const checkbox = page.getByRole('checkbox', { name: equipment, exact: true })
        assert.equal(await checkbox.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press('Space')
        assert.ok(await checkbox.isChecked())
        assert.equal(await checkbox.evaluate((element) => element === document.activeElement), true)
      }
      await navigateQuestion(() => next.press('Enter'), 2)
      for (const [index, answer] of [[2, '超過12小時'], [3, '超過10年'], [4, '設備耗電量高']]) {
        await page.getByLabel(answer, { exact: true }).press('Space')
        assert.equal(await page.getByLabel(answer, { exact: true }).evaluate((element) => element === document.activeElement), true)
        if (index < 4) await navigateQuestion(() => next.press('Enter'), index + 1)
      }
      // 逐題往回，包括第 1 題返回場所；再次前進仍聚焦正確題目且保留作答。
      for (let index = 3; index >= 0; index--) await navigateQuestion(() => back.press('Enter'), index)
      await navigate(() => back.press('Enter'), location, '選擇營業場所類型', 'H1')
      assert.ok(await page.getByRole('radio', { name: /^零售商店/ }).isChecked())
      await navigateQuestion(() => next.press('Enter'), 0)
      for (let index = 1; index < 5; index++) await navigateQuestion(() => next.press('Enter'), index)
      const summary = page.getByRole('heading', { name: '用電狀況回答摘要', level: 1, exact: true })
      await navigate(() => page.getByRole('button', { name: '查看回答摘要', exact: true }).press('Enter'), summary, '用電狀況回答摘要', 'H1')
      await assertSummary()
      await assertSkip(page.getByRole('button', { name: '修改營業場所類型', exact: true }))

      for (const [index, alternative] of [[0, '30001元以上'], [2, '9～12小時'], [4, '電費偏高']]) {
        const edit = page.getByRole('button', { name: `修改${defaultQuestions[index].title}`, exact: true })
        for (const save of [false, true]) {
          await edit.scrollIntoViewIfNeeded()
          const scrollY = await page.evaluate(() => window.scrollY)
          await navigateQuestion(() => edit.press('Enter'), index, true)
          assert.equal(await question.evaluate((element) => element.matches(':focus-visible')), true)
          assert.ok(await question.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth) >= 2))
          if (index === 0 && !save && process.env.ENERGY_BROWSER_ARTIFACTS) {
            await mkdir(process.env.ENERGY_BROWSER_ARTIFACTS, { recursive: true })
            await page.screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `question-focus-${viewport.width}.png`), fullPage: true })
          }
          await page.getByLabel(alternative, { exact: true }).press('Space')
          await page.evaluate(() => { window.focusTargets = [] })
          await page.getByRole('button', { name: save ? '儲存修改並返回摘要' : '取消修改', exact: true }).press(save ? 'Enter' : 'Space')
          if (save) expected[index + 1] = alternative
          await summary.waitFor()
          await assertSummary()
          assert.equal(await edit.evaluate((element) => element === document.activeElement), true)
          assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollY) <= 1)
          assert.deepEqual(await page.evaluate(() => window.focusTargets), [])
        }
      }

      await navigate(() => page.getByRole('button', { name: '修改營業場所類型', exact: true }).press('Enter'), location, '選擇營業場所類型', 'H1')
      await navigateQuestion(() => next.press('Enter'), 0)
      for (let index = 1; index < 5; index++) await navigateQuestion(() => next.press('Enter'), index)
      await navigate(() => page.getByRole('button', { name: '查看回答摘要', exact: true }).press('Enter'), summary, '用電狀況回答摘要', 'H1')
      await assertSummary()
      const recommendations = page.getByRole('heading', { name: '節能改善措施推薦', level: 1, exact: true })
      const showRecommendations = page.getByRole('button', { name: '查看節能改善建議' })
      await navigate(() => showRecommendations.press('Enter'), recommendations, '節能改善措施推薦', 'H1')
      const editAnswers = page.getByRole('button', { name: '修改回答', exact: true })
      await assertSkip(editAnswers)
      await navigate(() => page.keyboard.press('Enter'), summary, '用電狀況回答摘要', 'H1')
      await assertSummary()
      await navigate(() => showRecommendations.press('Enter'), recommendations, '節能改善措施推薦', 'H1')
      await navigate(() => page.getByRole('button', { name: '返回回答摘要／修改答案', exact: true }).press('Space'), summary, '用電狀況回答摘要', 'H1')
      await assertSummary()
      await page.getByRole('link', { name: '節能改善指南首頁', exact: true }).press('Enter')
      await assertFocused(page.getByRole('heading', { level: 1 }))
      assert.equal(await page.title(), '中小微能源用戶互動式節能改善指南')
      await assertSkip(start)
      assert.deepEqual(errors, [])
    } finally {
      await browser.close()
    }
  })
}
