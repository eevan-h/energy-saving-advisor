import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { places } from '../../src/data/places.ts'

const require = createRequire(process.env.ENERGY_PLAYWRIGHT_ROOT
  ? path.join(process.env.ENERGY_PLAYWRIGHT_ROOT, 'package.json') : import.meta.url)
const { chromium } = require('playwright')
const baseURL = process.env.ENERGY_TEST_URL ?? 'http://127.0.0.1:5175/energy-saving-advisor/'

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
  test(`場所選項布局、五類傳遞與鍵盤單選 ${viewport.width}px`, async () => {
    const browser = await chromium.launch({ channel: process.env.ENERGY_BROWSER_CHANNEL ?? 'chrome', headless: true })
    try {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 640, hasTouch: viewport.width < 640 })
      const page = await context.newPage()
      page.setDefaultTimeout(8000)
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const next = page.getByRole('button', { name: '下一步', exact: true })
      const radioFor = (place) => page.getByRole('radio', { name: new RegExp(`^${place.name}`) })
      const rows = page.locator('main fieldset label')
      const initialAnswers = ['3001～10000元', '照明', '5～8小時', '3～5年', '電費偏高']

      async function assertSelection(place) {
        assert.equal(await page.locator('input[name="place"]:checked').count(), 1)
        assert.ok(await radioFor(place).isChecked())
        assert.equal(await page.getByRole('status').innerText(), `已選擇：${place.name}`)
        assert.ok(await next.isEnabled())
        assert.equal(await rows.filter({ has: radioFor(place) }).getByText('✓', { exact: true }).count(), 1)
        assert.equal(await rows.getByText('✓', { exact: true }).count(), 1)
      }
      async function assertNoOverflow() {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }

      await page.goto(baseURL)
      await page.getByRole('button', { name: '開始節能評估' }).click()
      assert.equal(await rows.count(), 5)
      assert.equal(await page.getByRole('radio').count(), 5)
      assert.ok(await next.isDisabled())
      assert.equal(await page.locator('input[name="place"]:checked').count(), 0)
      const metrics = await rows.evaluateAll((labels) => {
        const rects = labels.map((label) => label.getBoundingClientRect())
        return {
          width: innerWidth,
          optionsHeight: labels[0].parentElement.getBoundingClientRect().height,
          rowHeights: rects.map((rect) => rect.height),
          columns: new Set(rects.map((rect) => rect.x)).size,
          pageHeight: document.documentElement.scrollHeight,
          nextY: document.querySelector('button[type="submit"]').getBoundingClientRect().top,
        }
      })
      console.log(`場所高度量測 ${JSON.stringify(metrics)}`)
      if (viewport.width < 640) {
        assert.equal(metrics.columns, 1)
        assert.ok(metrics.optionsHeight <= 1024 * 0.65)
        assert.ok(metrics.rowHeights.every((height) => height >= 48 && height < 192))
      } else {
        assert.equal(metrics.columns, viewport.width === 768 ? 2 : 3)
        assert.equal(metrics.optionsHeight, viewport.width === 768 ? 608 : 400)
        assert.deepEqual(metrics.rowHeights, [192, 192, 192, 192, 192])
      }
      for (const place of places) {
        const label = rows.filter({ has: radioFor(place) })
        assert.equal(await label.getByText(place.name, { exact: true }).count(), 1)
        assert.equal(await label.getByText(place.description, { exact: true }).count(), 1)
        assert.equal(await label.locator('svg path').getAttribute('d'), place.path)
        assert.equal(await radioFor(place).getAttribute('type'), 'radio')
        assert.ok(await label.getByText(place.name, { exact: true }).evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 18))
        assert.ok(await label.getByText(place.description, { exact: true }).evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 14))
        assert.equal(await label.evaluate((element) => element.scrollWidth > element.clientWidth), false)
      }
      await assertNoOverflow()

      // Tab 進入原生單選群組，Space 選取，方向鍵移動、循環及更新焦點。
      await page.keyboard.press('Tab')
      assert.equal(await radioFor(places[0]).evaluate((element) => element === document.activeElement), true)
      await page.keyboard.press('Space')
      await assertSelection(places[0])
      for (let index = 1; index <= places.length; index++) {
        await page.keyboard.press('ArrowDown')
        const place = places[index % places.length]
        await assertSelection(place)
        assert.equal(await radioFor(place).evaluate((element) => element === document.activeElement), true)
        assert.ok(await radioFor(place).evaluate((element) => parseFloat(getComputedStyle(element.nextElementSibling).outlineWidth) >= 2))
      }
      await page.keyboard.press('ArrowUp')
      await assertSelection(places[4])
      if (process.env.ENERGY_BROWSER_ARTIFACTS) {
        await mkdir(process.env.ENERGY_BROWSER_ARTIFACTS, { recursive: true })
        await page.screenshot({ path: path.join(process.env.ENERGY_BROWSER_ARTIFACTS, `places-${viewport.width}.png`), fullPage: true })
      }
      await page.keyboard.press('Tab')
      assert.equal(await page.getByRole('button', { name: '上一步', exact: true }).evaluate((element) => element === document.activeElement), true)
      await page.keyboard.press('Enter')
      await page.getByRole('button', { name: '開始節能評估' }).click()
      await assertSelection(places[4])

      // 依序點名稱、說明、圖示、留白及選取標記，每個場所完成問答與摘要往返。
      for (const [index, place] of places.entries()) {
        const label = rows.filter({ has: radioFor(place) })
        await page.locator('main fieldset').evaluate((fieldset) => {
          fieldset.dataset.changes = '0'
          fieldset.addEventListener('change', () => { fieldset.dataset.changes = String(Number(fieldset.dataset.changes) + 1) })
        })
        if (index === 0) await label.getByText(place.name, { exact: true }).click()
        else if (index === 1) await label.getByText(place.description, { exact: true }).click()
        else if (index === 2) await label.locator('svg').click()
        else if (index === 3) await label.click({ position: { x: 8, y: 8 } })
        else await label.locator('span[aria-hidden="true"]').click()
        await assertSelection(place)
        assert.equal(await page.locator('main fieldset').getAttribute('data-changes'), '1')
        const selectedStyle = await label.locator('input + span').evaluate((element) => ({ bg: getComputedStyle(element).backgroundColor, border: getComputedStyle(element).borderColor }))
        const unselected = rows.filter({ has: radioFor(places[(index + 1) % places.length]) })
        const unselectedStyle = await unselected.locator('input + span').evaluate((element) => ({ bg: getComputedStyle(element).backgroundColor, border: getComputedStyle(element).borderColor }))
        assert.notEqual(selectedStyle.bg, unselectedStyle.bg)
        assert.notEqual(selectedStyle.border, unselectedStyle.border)
        await next.click()
        assert.equal(await page.locator('main > section > p').first().innerText(), `營業場所：${place.name}`)
        for (const [questionIndex, answer] of initialAnswers.entries()) {
          await page.getByLabel(answer, { exact: true }).check()
          await page.getByRole('button', { name: questionIndex === 4 ? '查看回答摘要' : '下一步', exact: true }).click()
        }
        assert.deepEqual(await page.locator('main dl dd > span').allTextContents(), [place.name, ...initialAnswers])
        await page.getByRole('button', { name: '修改營業場所類型', exact: true }).click()
        await assertSelection(place)
        await assertNoOverflow()
      }
      assert.deepEqual(errors, [])
    } finally {
      await browser.close()
    }
  })
}
