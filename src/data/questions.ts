import type { PlaceType } from './places'

export const defaultQuestions = [
  { id: 'monthlyBill', title: '每月平均電費', type: 'single', options: ['3000元以下', '3001～10000元', '10001～30000元', '30001元以上', '不清楚'] },
  { id: 'equipment', title: '主要用電設備', type: 'multiple', options: ['空調', '照明', '冷凍冷藏', '空壓', '其他'] },
  { id: 'operatingHours', title: '每天運轉時數', type: 'single', options: ['4小時以下', '5～8小時', '9～12小時', '超過12小時', '不清楚'] },
  { id: 'equipmentAge', title: '設備使用年限', type: 'single', options: ['未滿3年', '3～5年', '6～10年', '超過10年', '不清楚'] },
  { id: 'priority', title: '最想改善問題', type: 'single', options: ['電費偏高', '空調冷房效果不佳', '照明設備老舊', '設備耗電量高', '不知道從何開始節能'] },
] as const

export type Question = typeof defaultQuestions[number]
export type Answers = {
  [Q in Question as Q['id']]?: Q['type'] extends 'multiple'
    ? Array<Q['options'][number]>
    : Q['options'][number]
}

// 各場所目前共用五題。未來可在此設定場所專屬題目順序或子集。
const questionsByPlace: Partial<Record<PlaceType, readonly Question[]>> = {}

export function getQuestionsForPlace(place: PlaceType): readonly Question[] {
  return questionsByPlace[place] ?? defaultQuestions
}

export function isAnswered(question: Question, answers: Answers): boolean {
  const answer = answers[question.id]
  if (question.type === 'multiple') {
    return Array.isArray(answer) && answer.length > 0 && answer.every((value) => question.options.some((option) => option === value))
  }
  return typeof answer === 'string' && question.options.some((option) => option === answer)
}

export function formatAnswer(question: Question, answers: Answers): string {
  const answer = answers[question.id]
  return Array.isArray(answer) ? question.options.filter((option) => answer.some((value) => value === option)).join('、') : answer ?? '尚未回答'
}
