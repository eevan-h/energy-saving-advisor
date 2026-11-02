import assert from 'node:assert/strict'
import test from 'node:test'
import { measures } from '../src/data/measures.ts'
import { measureReviews, reviewLabel } from '../src/data/measureReviews.ts'
import type { Answers } from '../src/data/questions.ts'
import { recommend, scoreDisclaimer, tieBreakExplanation } from '../src/lib/recommendations.ts'

const baseline: Answers = {
  monthlyBill: '3001～10000元', equipment: ['空調'], operatingHours: '5～8小時', equipmentAge: '未滿3年', priority: '電費偏高',
}

test('辦公室空調老舊：對應冷房問題，增加檢測及汰換評估', () => {
  const results = recommend('office', { ...baseline, equipmentAge: '超過10年', priority: '空調冷房效果不佳' })
  assert.equal(results[0].measure.id, 'ac-check')
  const replacement = results.find((result) => result.measure.id === 'ac-replacement')!
  assert.ok(replacement)
  assert.ok(results[0].reasons.some((reason) => reason.ruleId === 'direct-problem' && reason.evidence.some((item) => item.answer === '空調冷房效果不佳')))
  assert.ok(replacement.reasons.some((reason) => reason.ruleId === 'age-review' && reason.evidence.some((item) => item.answer === '超過10年')))
  assert.ok(replacement.reasons.some((reason) => reason.ruleId === 'investment-review' && reason.points < 0))
  assert.ok(results.find((result) => result.measure.id === 'ac-check')!.rank < replacement.rank)
})

test('餐飲冷凍冷藏長時間運轉：提高運轉管理，不要求停機', () => {
  const answers: Answers = { ...baseline, equipment: ['冷凍冷藏'], operatingHours: '超過12小時' }
  const results = recommend('food', answers)
  assert.equal(results[0].measure.id, 'refrigeration-operation')
  const short = recommend('food', { ...answers, operatingHours: '4小時以下' }).find((result) => result.measure.id === 'refrigeration-operation')!
  assert.equal(results[0].score - short.score, 35)
  assert.ok(results[0].reasons.some((reason) => reason.evidence.some((item) => item.field === 'operatingHours' && item.answer === '超過12小時')))
  assert.ok(results[0].measure.suggestions.some((suggestion) => suggestion.includes('不得為節能任意停機')))
})

test('小型工廠空壓：先檢測洩漏及壓力，場所不改變設備匹配分數', () => {
  const answers: Answers = { ...baseline, equipment: ['空壓'], priority: '設備耗電量高' }
  const results = recommend('factory', answers)
  assert.equal(results[0].measure.id, 'compressed-air-check')
  assert.ok(results[0].reasons.some((reason) => reason.explanation.includes('洩漏') && reason.explanation.includes('壓力')))
  const office = recommend('office', answers).find((result) => result.measure.id === 'compressed-air-check')!
  assert.equal(results[0].score - office.score, 0)
  assert.ok(results.every((result) => result.measure.category === '空壓' || result.measure.category === '一般用電管理'))
})

test('多設備選擇：涵蓋已選設備，直接對應問題者優先，沒有未選設備', () => {
  const results = recommend('retail', { ...baseline, equipment: ['空調', '照明', '冷凍冷藏'], priority: '照明設備老舊' })
  assert.equal(results[0].measure.category, '照明')
  assert.deepEqual(new Set(results.map((result) => result.measure.category)), new Set(['空調', '照明', '冷凍冷藏', '一般用電管理']))
  assert.ok(!results.some((result) => result.measure.equipment === '空壓'))
  assert.ok(results.some((result) => result.measure.id === 'lighting-replacement'))
})

test('回答不清楚：提示補資料，不判定老舊、長時數或高電費', () => {
  const results = recommend('office', { ...baseline, monthlyBill: '不清楚', operatingHours: '不清楚', equipmentAge: '不清楚', priority: '不知道從何開始節能' })
  assert.ok(results.length > 0)
  assert.ok(results.every((result) => result.measure.kind !== 'replacement'))
  const reasons = results.flatMap((result) => result.reasons)
  for (const id of ['age-review', 'long-operation', 'bill-records']) assert.ok(!reasons.some((reason) => reason.ruleId === id))
  const general = results.find((result) => result.measure.id === 'energy-management')!
  assert.equal(general.reasons.filter((reason) => reason.ruleId === 'unknown-followup').length, 1)
  assert.equal(general.reasons.find((reason) => reason.ruleId === 'unknown-followup')!.evidence.length, 3)
})

test('僅選其他：只給一般盤點，不依餐飲場所猜測冷凍冷藏設備', () => {
  const results = recommend('food', { ...baseline, equipment: ['其他'], equipmentAge: '超過10年', operatingHours: '超過12小時' })
  assert.deepEqual(results.map((result) => result.measure.id), ['energy-management'])
  assert.ok(results[0].reasons.some((reason) => reason.ruleId === 'other-equipment'))
})

test('問題與設備不一致：提示確認，不推薦未選的空調', () => {
  const results = recommend('office', { ...baseline, equipment: ['照明'], priority: '空調冷房效果不佳' })
  assert.ok(!results.some((result) => result.measure.equipment === '空調'))
  assert.ok(results.find((result) => result.measure.id === 'energy-management')!.reasons.some((reason) => reason.ruleId === 'equipment-conflict'))
})

test('較高電費級距僅提高帳單盤點，不宣稱浪費或推定用電量', () => {
  const low = recommend('office', baseline).find((result) => result.measure.id === 'energy-management')!
  const high = recommend('office', { ...baseline, monthlyBill: '30001元以上' }).find((result) => result.measure.id === 'energy-management')!
  assert.equal(high.score - low.score, 15)
  assert.ok(high.reasons.some((reason) => reason.ruleId === 'bill-records' && reason.explanation.includes('不能證明用電浪費')))
})

test('排序可追溯且穩定：分數等於命中規則總和，順位連續', () => {
  const answers: Answers = { ...baseline, equipment: ['空調', '照明', '冷凍冷藏', '空壓'], equipmentAge: '6～10年', operatingHours: '9～12小時' }
  const results = recommend('factory', answers)
  assert.equal(results.length, measures.length)
  assert.deepEqual(recommend('factory', answers), results)
  results.forEach((result, index) => {
    assert.equal(result.rank, index + 1)
    assert.equal(result.score, result.reasons.reduce((sum, reason) => sum + reason.points, 0))
    assert.ok(result.reasons.every((reason) => reason.ruleId.length && reason.explanation.length && reason.evidence.every((item) => item.answer.length)))
    assert.equal(new Set(result.reasons.map((reason) => reason.ruleId)).size, result.reasons.length)
    if (index) assert.ok(results[index - 1].score >= result.score)
  })
})

test('答案修改後重算，不留下原有設備推薦；未完整作答不產生結果', () => {
  const before = recommend('office', { ...baseline, equipmentAge: '超過10年' })
  const after = recommend('retail', { ...baseline, equipment: ['照明'] })
  assert.ok(before.some((result) => result.measure.id === 'ac-replacement'))
  assert.ok(after.every((result) => result.measure.equipment !== '空調'))
  assert.deepEqual(recommend('office', {}), [])
  assert.deepEqual(recommend('office', { ...baseline, equipment: [] }), [])
})

test('所有示範措施具備來源與待審標示，不因誤設 reviewed 就成為已審核', () => {
  assert.equal(new Set(measures.map((measure) => measure.id)).size, measures.length)
  assert.equal(new Set(measures.map((measure) => measure.category)).size, 5)
  for (const measure of measures) {
    assert.equal(reviewLabel(measureReviews[measure.id]), '示範建議，待專業審核')
    assert.ok(measureReviews[measure.id].source.title.includes('示範'))
    assert.ok(measure.suggestions.length >= 2)
  }
  assert.equal(reviewLabel({ ...measureReviews[measures[0].id], reviewStatus: 'reviewed' }), '示範建議，待專業審核')
})

test('空調冷房問題優先檢測，不以排程管理或汰換取代原因查核', () => {
  const results = recommend('office', { ...baseline, operatingHours: '超過12小時', equipmentAge: '超過10年', priority: '空調冷房效果不佳' })
  assert.equal(results[0].measure.id, 'ac-check')
  assert.equal(results[0].reasons.find((reason) => reason.ruleId === 'direct-problem')!.points, 60)
  const operation = results.find((result) => result.measure.id === 'ac-operation')!
  assert.equal(operation.reasons.find((reason) => reason.ruleId === 'direct-problem')!.points, 20)
  assert.ok(operation.reasons.some((reason) => reason.explanation.includes('冷房需求') && reason.explanation.includes('使用時段')))
})

test('照明老舊優先連結檢測與更新，不無條件認定開關管理有問題', () => {
  const results = recommend('office', { ...baseline, equipment: ['照明'], priority: '照明設備老舊' })
  const check = results.find((result) => result.measure.id === 'lighting-check')!
  const replacement = results.find((result) => result.measure.id === 'lighting-replacement')!
  const operation = results.find((result) => result.measure.id === 'lighting-operation')!
  assert.ok(check.score > operation.score)
  assert.ok(replacement.score > operation.score)
  assert.ok(!operation.reasons.some((reason) => reason.ruleId === 'direct-problem'))
  assert.ok(operation.reasons.some((reason) => reason.explanation.includes('營業時段') && reason.explanation.includes('無人區域') && reason.explanation.includes('照明需求')))
})

test('四類設備運轉管理權重不同，理由各自連結實際使用需求', () => {
  const results = recommend('factory', { ...baseline, equipment: ['空調', '照明', '冷凍冷藏', '空壓'], operatingHours: '超過12小時' })
  const cases = [
    ['ac-operation', 25, '冷房需求'], ['lighting-operation', 20, '無人區域'],
    ['refrigeration-operation', 35, '溫度管理'], ['compressed-air-operation', 30, '壓力紀錄'],
  ] as const
  for (const [id, points, keyword] of cases) {
    const reason = results.find((result) => result.measure.id === id)!.reasons.find((item) => item.ruleId === 'long-operation')!
    assert.equal(reason.points, points)
    assert.ok(reason.explanation.includes(keyword))
    assert.deepEqual(reason.evidence, [{ field: 'operatingHours', answer: '超過12小時' }])
  }
})

test('一般管理理由不重複設備清單與未知項目，基準及投資分數不偽裝成回答', () => {
  const results = recommend('office', { ...baseline, monthlyBill: '不清楚', operatingHours: '不清楚', equipmentAge: '不清楚' })
  const general = results.find((result) => result.measure.id === 'energy-management')!
  assert.deepEqual(general.reasons.find((reason) => reason.ruleId === 'general-baseline')!.evidence, [])
  assert.equal(general.reasons.find((reason) => reason.ruleId === 'general-baseline')!.showInReasons, false)
  const visible = general.reasons.filter((reason) => reason.showInReasons)
  assert.ok(visible.every((reason) => !reason.evidence.some((item) => item.field === 'equipment')))
  assert.equal(visible.filter((reason) => reason.ruleId.startsWith('unknown-')).length, 1)
  assert.ok(visible.some((reason) => reason.explanation.includes('非營業時間') && reason.explanation.includes('未確認管理制度')))
  const old = recommend('office', { ...baseline, equipmentAge: '超過10年' })
  assert.deepEqual(old.find((result) => result.measure.kind === 'replacement')!.reasons.find((reason) => reason.ruleId === 'investment-review')!.evidence, [])
})

test('未知設備狀態保守說明，照明問題不得將未知年限當成已知年限', () => {
  const results = recommend('retail', { ...baseline, equipment: ['照明', '空壓'], priority: '照明設備老舊', equipmentAge: '不清楚', operatingHours: '不清楚' })
  const replacement = results.find((result) => result.measure.id === 'lighting-replacement')!
  assert.ok(!replacement.reasons.some((reason) => reason.ruleId === 'age-review'))
  assert.ok(replacement.reasons.some((reason) => reason.ruleId === 'unconfirmed-context' && reason.explanation.includes('年限尚未確認')))
  const operation = results.find((result) => result.measure.id === 'compressed-air-operation')!
  assert.ok(!operation.reasons.some((reason) => reason.ruleId === 'long-operation'))
  assert.ok(operation.reasons.some((reason) => reason.ruleId === 'unconfirmed-context' && reason.explanation.includes('運轉時數尚未確認')))
})

test('所有引用均來自實際回答，場所不成為理由或分數，設備理由僅引該設備', () => {
  const answers: Answers = { ...baseline, equipment: ['空調', '照明', '冷凍冷藏', '空壓'], operatingHours: '9～12小時', equipmentAge: '超過10年' }
  const office = recommend('office', answers)
  assert.deepEqual(office, recommend('food', answers))
  for (const result of office) {
    for (const reason of result.reasons) {
      assert.notEqual(reason.ruleId, 'place-context')
      for (const item of reason.evidence) {
        const actual = answers[item.field]
        assert.ok(Array.isArray(actual) ? actual.includes(item.answer as typeof actual[number]) || actual.join('、') === item.answer : actual === item.answer)
      }
    }
    if (result.measure.equipment !== '全場所') assert.deepEqual(result.reasons.find((reason) => reason.ruleId === 'selected-equipment')!.evidence, [{ field: 'equipment', answer: result.measure.equipment }])
  }
})

test('同分固定排序，不受目錄或設備勾選順序影響，最後以措施編號決定', () => {
  const answers: Answers = { ...baseline, equipment: ['空調', '照明', '冷凍冷藏', '空壓'] }
  const results = recommend('office', answers)
  const reverse = recommend('office', { ...answers, equipment: [...answers.equipment!].reverse() }, [...measures].reverse())
  assert.deepEqual(results.map((result) => result.measure.id), reverse.map((result) => result.measure.id))
  const sameScoreChecks = results.filter((result) => result.measure.kind === 'inspection')
  assert.deepEqual(sameScoreChecks.map((result) => result.measure.category), ['空調', '照明', '冷凍冷藏', '空壓'])
  const one = measures.find((measure) => measure.id === 'ac-check')!
  assert.deepEqual(recommend('office', baseline, [{ ...one, id: 'b' }, { ...one, id: 'a' }]).map((result) => result.measure.id), ['a', 'b'])
  assert.ok(tieBreakExplanation.includes('不受目錄輸入順序影響'))
})

test('分數定義明確排除節能率、金額及投資報酬率', () => {
  for (const text of ['規則匹配分數', '並非節能率、節省金額或投資報酬率']) assert.ok(scoreDisclaimer.includes(text))
})

