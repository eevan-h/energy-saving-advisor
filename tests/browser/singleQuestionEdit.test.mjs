import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(process.env.ENERGY_PLAYWRIGHT_ROOT
  ? path.join(process.env.ENERGY_PLAYWRIGHT_ROOT, 'package.json') : import.meta.url)
const { chromium } = require('playwright')
const baseURL = process.env.ENERGY_TEST_URL ?? 'http://127.0.0.1:5175/energy-saving-advisor/'

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`單題修改、取消還原、焦點與推薦重算 ${viewport.width}px`, async () => {
    const browser = await chromium.launch({ channel: process.env.ENERGY_BROWSER_CHANNEL ?? 'chrome', headless: true })
    try {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 640, hasTouch: viewport.width < 640 })
      const page = await context.newPage()
      page.setDefaultTimeout(8000)
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const summary = page.getByRole('heading', { name: '用電狀況回答摘要', exact: true })
      const save = page.getByRole('button', { name: '儲存修改並返回摘要', exact: true })
      const cancel = page.getByRole('button', { name: '取消修改', exact: true })
      const expected = ['小型工廠', '3001～10000元', '空調、照明、冷凍冷藏、空壓', '超過12小時', '超過10年', '設備耗電量高']

      async function assertSummary() {
        await summary.waitFor()
        assert.deepEqual(await page.locator('main dl dd > span').allTextContents(), expected)
        assert.equal(await save.count(), 0)
        assert.equal(await cancel.count(), 0)
        await assertNoOverflow()
      }
      async function assertNoOverflow() {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }
      async function beginEdit(number, title) {
        const button = page.getByRole('button', { name: `修改${title}`, exact: true })
        await button.scrollIntoViewIfNeeded()
        const scrollY = await page.evaluate(() => window.scrollY)
        await button.press('Enter')
        const heading = page.getByRole('heading', { name: `正在修改第 ${number} 題`, exact: true })
        await heading.waitFor()
        assert.equal(await page.locator('main form legend').evaluate((element) => element === document.activeElement), true)
        assert.equal(await page.evaluate(() => window.scrollY), 0)
        assert.equal(await page.getByRole('button', { name: '下一步', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: '上一步', exact: true }).count(), 0)
        await assertNoOverflow()
        return async () => {
          await assertSummary()
          assert.equal(await button.evaluate((element) => element === document.activeElement), true)
          assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollY) <= 1)
          const bounds = await button.boundingBox()
          // 捲動座標取整數，版面座標可能有小數像素。
          assert.ok(bounds.y >= -1 && bounds.y + bounds.height <= viewport.height + 1, JSON.stringify({ number, bounds, scrollY, viewport }))
        }
      }

      await page.goto(baseURL)
      await page.getByRole('button', { name: '開始節能評估' }).click()
      await page.getByText('小型工廠', { exact: true }).click()
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      const initial = [['3001～10000元'], ['空調', '照明', '冷凍冷藏', '空壓'], ['超過12小時'], ['超過10年'], ['設備耗電量高']]
      for (const [index, options] of initial.entries()) {
        assert.equal(await save.count(), 0)
        assert.equal(await cancel.count(), 0)
        assert.ok(await page.getByRole('heading', { name: '用電狀況問答', exact: true }).isVisible())
        for (const option of options) await page.getByLabel(option, { exact: true }).check()
        await page.getByRole('button', { name: index === 4 ? '查看回答摘要' : '下一步', exact: true }).click()
      }
      await assertSummary()
      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      const results = page.locator('main > section > ol > li')
      const originalResults = (await results.allInnerTexts()).join('\n')
      assert.equal(await results.count(), 13)
      await page.getByRole('button', { name: '修改回答', exact: true }).click()

      // 第 1、3、5 題：直接儲存，確認其餘四題及場所完全保留。
      for (const [number, title, answer] of [
        [1, '每月平均電費', '30001元以上'],
        [3, '每天運轉時數', '5～8小時'],
        [5, '最想改善問題', '電費偏高'],
      ]) {
        const assertReturned = await beginEdit(number, title)
        await page.getByLabel(answer, { exact: true }).press('Space')
        assert.ok(await save.isEnabled())
        await page.keyboard.press('Tab')
        assert.equal(await cancel.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press('Tab')
        assert.equal(await save.evaluate((element) => element === document.activeElement), true)
        assert.equal(await save.evaluate((element) => element.matches(':focus-visible')), true)
        assert.ok(await save.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth) >= 2))
        await assertNoOverflow()
        for (const button of [cancel, save]) {
          const bounds = await button.boundingBox()
          assert.ok(bounds.height >= 48 && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width)
        }
        if (number === 1 && process.env.ENERGY_BROWSER_ARTIFACTS) {
          await mkdir(process.env.ENERGY_BROWSER_ARTIFACTS, { recursive: true })
          await page.screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `single-edit-${viewport.width}.png`), fullPage: true })
        }
        expected[number] = answer
        await page.keyboard.press('Enter')
        await assertReturned()
      }

      // 重複修改：取消必須還原最新儲存值，而非首次填答值。
      for (let repeat = 0; repeat < 2; repeat++) {
        const assertReturned = await beginEdit(1, '每月平均電費')
        assert.ok(await page.getByLabel('30001元以上', { exact: true }).isChecked())
        await page.getByLabel('不清楚', { exact: true }).check()
        await cancel.press('Space')
        await assertReturned()
      }

      // 複選清空屬無效答案；按 Enter／直接提交均不能儲存。
      let assertReturned = await beginEdit(2, '主要用電設備')
      for (const option of initial[1]) await page.getByLabel(option, { exact: true }).uncheck()
      assert.ok(await save.isDisabled())
      await page.getByLabel('空壓', { exact: true }).press('Enter')
      await page.locator('main form').evaluate((form) => form.requestSubmit())
      assert.ok(await page.getByRole('heading', { name: '正在修改第 2 題', exact: true }).isVisible())
      assert.equal(await summary.count(), 0)
      await page.getByLabel('其他', { exact: true }).check()
      await cancel.press('Enter')
      await assertReturned()

      // 取消後重開複選，逐項確認還原，接著儲存真正的新答案。
      assertReturned = await beginEdit(2, '主要用電設備')
      for (const option of initial[1]) assert.ok(await page.getByLabel(option, { exact: true }).isChecked())
      assert.equal(await page.getByLabel('其他', { exact: true }).isChecked(), false)
      for (const option of initial[1]) await page.getByLabel(option, { exact: true }).uncheck()
      await page.getByLabel('其他', { exact: true }).check()
      expected[2] = '其他'
      await save.click()
      await assertReturned()

      // 修改完成後，普通「上一步」仍回到第 5 題原問答流程。
      await page.getByRole('button', { name: '上一步', exact: true }).click()
      assert.ok(await page.getByRole('heading', { name: '用電狀況問答', exact: true }).isVisible())
      assert.equal(await save.count(), 0)
      assert.equal(await cancel.count(), 0)
      await page.getByRole('button', { name: '查看回答摘要', exact: true }).click()
      await assertSummary()

      await page.getByRole('button', { name: '查看節能改善建議' }).click()
      assert.equal(await results.count(), 1)
      assert.ok(await results.getByRole('heading', { name: '建立電費與設備用電紀錄', exact: true }).isVisible())
      assert.notEqual(await results.innerText(), originalResults)
      await results.locator('summary').click()
      const resultText = await results.innerText()
      assert.match(resultText, /30001元以上/)
      assert.match(resultText, /電費偏高/)
      assert.doesNotMatch(resultText, /超過12小時/)
      await assertNoOverflow()
      await page.getByRole('button', { name: '修改回答', exact: true }).click()
      await assertSummary()

      // 中途由既有首頁連結離開，也不可遺留修改模式或未儲存答案。
      await beginEdit(1, '每月平均電費')
      await page.getByLabel('不清楚', { exact: true }).check()
      await page.getByRole('link', { name: '節能改善指南首頁', exact: true }).click()
      await page.getByRole('button', { name: '開始節能評估' }).click()
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      assert.ok(await page.getByRole('heading', { name: '用電狀況問答', exact: true }).isVisible())
      assert.ok(await page.getByLabel('30001元以上', { exact: true }).isChecked())
      assert.equal(await save.count(), 0)
      assert.equal(await cancel.count(), 0)
      assert.deepEqual(errors, [])
    } finally {
      await browser.close()
    }
  })
}
