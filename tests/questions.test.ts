import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultQuestions, formatAnswer, getQuestionsForPlace, isAnswered, type Answers } from '../src/data/questions.ts'

test('五種場所目前共用五題，且題目識別碼唯一', () => {
  for (const place of ['office', 'retail', 'food', 'factory', 'service'] as const) {
    assert.equal(getQuestionsForPlace(place).length, 5)
  }
  assert.equal(new Set(defaultQuestions.map((question) => question.id)).size, 5)
})

test('每題未作答皆不可前進，不清楚是有效答案', () => {
  for (const question of defaultQuestions) assert.equal(isAnswered(question, {}), false)
  assert.equal(isAnswered(defaultQuestions[0], { monthlyBill: '不清楚' }), true)
  assert.equal(isAnswered(defaultQuestions[2], { operatingHours: '不清楚' }), true)
  assert.equal(isAnswered(defaultQuestions[3], { equipmentAge: '不清楚' }), true)
})

test('複選至少一項，清空或不合法的設備答案不可前進', () => {
  const question = defaultQuestions[1]
  assert.equal(isAnswered(question, { equipment: [] }), false)
  assert.equal(isAnswered(question, { equipment: ['空調', '照明'] }), true)
  assert.equal(isAnswered(question, { equipment: ['不合法設備'] } as unknown as Answers), false)
  assert.equal(isAnswered(question, { equipment: '空調' } as unknown as Answers), false)
})

test('單選不接受其他題目的選項或陣列', () => {
  assert.equal(isAnswered(defaultQuestions[0], { monthlyBill: '電費偏高' } as unknown as Answers), false)
  assert.equal(isAnswered(defaultQuestions[0], { monthlyBill: ['不清楚'] } as unknown as Answers), false)
})

test('完整回答可通過驗證，摘要依題目順序呈現複選內容', () => {
  const answers: Answers = {
    monthlyBill: '3001～10000元',
    equipment: ['冷凍冷藏', '空調', '照明'],
    operatingHours: '9～12小時',
    equipmentAge: '不清楚',
    priority: '電費偏高',
  }
  assert.equal(defaultQuestions.every((question) => isAnswered(question, answers)), true)
  assert.deepEqual(defaultQuestions.map((question) => formatAnswer(question, answers)), [
    '3001～10000元', '空調、照明、冷凍冷藏', '9～12小時', '不清楚', '電費偏高',
  ])
})
