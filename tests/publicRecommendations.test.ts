import assert from 'node:assert/strict'
import test from 'node:test'
import { measures } from '../src/data/measures.ts'
import { measureReviews } from '../src/data/measureReviews.ts'

test('公開措施不攜帶內部來源與審核欄位，13筆待審資料仍保存於內部', () => {
  assert.equal(measures.length, 13)
  for (const measure of measures) {
    assert.ok(!Object.hasOwn(measure, 'source'))
    assert.ok(!Object.hasOwn(measure, 'reviewStatus'))
    assert.equal(measureReviews[measure.id].reviewStatus, 'pending')
  }
  assert.doesNotMatch(JSON.stringify(measures), /SRC-\d{3}|\.pdf|印刷頁碼|reviewStatus/)
})

test('商用冷凍冷藏內容分清櫃型、風道與食品保存，不依年限直接換新', () => {
  const text = (id: string) => measures.find((item) => item.id === id)!.suggestions.join('')
  assert.match(text('refrigeration-check'), /有門或蓋.*開放式展示櫃/)
  assert.match(text('refrigeration-check'), /通風.*原廠.*清潔/)
  assert.match(text('refrigeration-operation'), /堆放範圍.*風道.*隨手關妥/)
  assert.match(text('refrigeration-operation'), /不得為節能任意停機或提高保存溫度/)
  assert.match(text('refrigeration-replacement'), /老舊不代表一定要換新/)
  assert.match(text('refrigeration-replacement'), /相同.*保存條件.*食品暫存.*所需溫度/)
})
