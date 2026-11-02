import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { measures } from '../src/data/measures.ts'
import { measureReviews, reviewLabel } from '../src/data/measureReviews.ts'
import { formatPageRange, getTechnicalEvidence, supportDisclaimer, technicalEvidence, technicalSources } from '../src/data/technicalEvidence.ts'

const register = readFileSync(new URL('../docs/energy-sources-register.md', import.meta.url), 'utf8')
const review = readFileSync(new URL('../docs/energy-measures-review.md', import.meta.url), 'utf8')

test('內部保留三項空壓措施依據，六筆分類與審核紀錄一致', () => {
  assert.deepEqual(Object.keys(technicalEvidence), ['compressed-air-check', 'compressed-air-operation', 'compressed-air-replacement'])
  const expected = [['A', 'A'], ['B', 'A'], ['B', 'B']]
  Object.entries(technicalEvidence).forEach(([id, evidence], index) => {
    assert.deepEqual(evidence.references.map((item) => item.support), expected[index])
    assert.deepEqual(evidence.references.map((item) => item.sourceId), ['SRC-002', 'SRC-003'])
    for (const ref of evidence.references) {
      const row = register.split('\n').find((line) => line.startsWith(`| \`${ref.sourceId}\` | \`${id}\``))!
      assert.ok(row)
      assert.ok(row.includes(`| ${ref.support} —`))
      const reviewRow = review.split('\n').find((line) => line.startsWith(`| \`${id}\``) && line.includes(`| \`${ref.sourceId}\``))!
      assert.ok(reviewRow?.includes(`| ${ref.support} —`))
      const pdf = ref.pages.map((p) => formatPageRange(p.pdf)).join('；')
      const printed = ref.pages.map((p) => formatPageRange(p.printed)).join('；')
      assert.ok(row.includes(`| ${pdf} | ${printed} |`), `${id}/${ref.sourceId}頁碼應逐筆符合審核表`)
      assert.ok(reviewRow.includes(`| ${pdf} | ${printed} |`))
      for (const locator of ref.pages) {
        assert.ok(locator.pdf[0] > 0 && (locator.pdf[1] ?? locator.pdf[0]) <= (ref.sourceId === 'SRC-002' ? 57 : 58))
        assert.ok(locator.printed[0] > 0)
      }
    }
  })
})

test('書目採實際名稱，不把文獻支持當專業審核或現行標準', () => {
  for (const source of Object.values(technicalSources)) {
    assert.ok(register.includes(source.title))
    assert.ok(source.edition.includes('待查證'))
  }
  assert.match(supportDisclaimer, /不代表.*專業審核通過/)
  assert.equal(measures.length, 13)
  assert.ok(measures.every((measure) => reviewLabel(measureReviews[measure.id]) === '示範建議，待專業審核'))
})

test('無內部配對措施與任意ID不套用空壓依據', () => {
  for (const measure of measures.filter((item) => item.category !== '空壓')) assert.equal(getTechnicalEvidence(measure.id), undefined)
  for (const id of ['unknown', 'constructor', '__proto__', 'toString']) assert.equal(getTechnicalEvidence(id), undefined)
})

test('注意事項分清巡檢與專業檢測、製程安全及負載評估', () => {
  assert.match(technicalEvidence['compressed-air-check'].precautions.join(''), /一般巡檢.*專業|一般巡檢.*受訓/)
  assert.match(technicalEvidence['compressed-air-check'].precautions.join(''), /隔離.*洩壓.*帶壓/)
  assert.match(technicalEvidence['compressed-air-operation'].precautions.join(''), /不得影響製程與安全/)
  assert.match(technicalEvidence['compressed-air-replacement'].precautions.join(''), /勿僅依.*年限.*汰換/)
  assert.match(technicalEvidence['compressed-air-replacement'].precautions.join(''), /變頻.*負載.*原廠/)
})

test('內部依據不含PDF網址或本機路徑，public不放PDF', () => {
  assert.doesNotMatch(JSON.stringify({ technicalSources, technicalEvidence }), /\.pdf|file:|C:\/|https?:/i)
  assert.ok(!readdirSync(new URL('../public', import.meta.url), { recursive: true }).some((file) => String(file).toLowerCase().endsWith('.pdf')))
})
