import { measures, type Measure } from '../data/measures.ts'
import { places, type PlaceType } from '../data/places.ts'
import { defaultQuestions, isAnswered, type Answers } from '../data/questions.ts'

export const RULE_VERSION = 'demo-rules-v2'
export const scoreDisclaimer = '規則匹配分數僅表示回答與示範措施的匹配程度及排序依據，並非節能率、節省金額或投資報酬率，也不代表專業診斷。'

export type AnswerEvidence = { field: keyof Answers; answer: string }
export type RuleReason = {
  ruleId: string
  evidence: AnswerEvidence[]
  explanation: string
  points: number
  showInReasons: boolean
}
export type Recommendation = {
  measure: Measure
  reasons: RuleReason[]
  score: number
  rank: number
  priority: '優先檢視' | '接續安排' | '後續評估'
}

export const orderingExplanation = '已選設備 +40；冷房問題對應空調檢測 +60、更新評估 +35、時段管理 +20；照明老舊對應檢測 +50、更新評估 +55，不為開關時段管理加分。設備耗電量高：設備專屬檢測 +30、運轉管理 +10。年限 6～10 年或超過 10 年：檢測 +25、更新評估 +20。每日 9～12 小時或超過 12 小時：空調時段管理 +25、照明開關管理 +20、冷凍冷藏溫度管理 +35、空壓供氣管理 +30、一般管理 +10。一般管理起始 +10，電費偏高 +25、不知道從何開始 +35，月費 10001～30000 元或 30001 元以上 +15，不清楚資料需補齊 +20（一次），僅選其他或問題與設備不一致 +25。需設備投資 -10。場所不加分，不由場所假設設備存在。'
export const tieBreakExplanation = '同分依序比較設備投資需求（不需新增、視檢測結果、需要投資）、措施類型（檢測、運轉管理、更新評估、一般管理）、設備類別（空調、照明、冷凍冷藏、空壓、一般用電管理），最後按措施編號的字元順序排列；不受目錄輸入順序影響。'

const operationPoints = { '空調': 25, '照明': 20, '冷凍冷藏': 35, '空壓': 30, '其他': 0, '全場所': 10 }
const longOperationReasons = {
  '空調': '整體運轉時數較長，可先比對空調使用時段與實際冷房需求；尚未確認每台空調的運轉時數。',
  '照明': '整體運轉時數較長，可先核對營業時段、無人區域與必要照明需求；不表示照明在無人時仍開啟。',
  '冷凍冷藏': '整體運轉時數較長，可優先核對冷凍冷藏的持續運轉需求與溫度管理；這不等於已確認全天運轉，不建議為節能任意停機。',
  '空壓': '整體運轉時數較長，可先比對供氣時段、空載與壓力紀錄；仍需確認空壓機實際運轉情形。',
  '其他': '需再確認其他設備的實際使用時段。',
  '全場所': '整體運轉時數較長，可建立營業與非營業時間的必要用電清單及巡查制度；不能據此判定有非營業時間浪費。',
}
const diagnosisReasons = {
  '空調': '你關注設備耗電量，先比對冷房需求、保養狀態與量測紀錄，不直接判定空調效率不佳。',
  '照明': '你關注設備耗電量，先盤點照明需求、燈具與使用情形，不直接判定照明耗電異常。',
  '冷凍冷藏': '你關注設備耗電量，先核對溫度紀錄、門封與散熱狀態，不直接判定冷凍冷藏有異常。',
  '空壓': '你關注設備耗電量，先安排洩漏與供氣壓力檢查，不將洩漏或壓力過高視為已確認問題。',
  '其他': '先核對設備實際狀況與量測紀錄。',
  '全場所': '先建立用電紀錄。',
}

function problemPoints(measure: Measure, priority: Answers['priority']): number {
  if (!measure.matchingProblems.some((problem) => problem === priority)) return 0
  if (priority === '空調冷房效果不佳' && measure.equipment === '空調') return { inspection: 60, replacement: 35, operation: 20, management: 0 }[measure.kind]
  if (priority === '照明設備老舊' && measure.equipment === '照明') return { inspection: 50, replacement: 55, operation: 0, management: 0 }[measure.kind]
  return 0
}

export function recommend(place: PlaceType, answers: Answers, catalog: readonly Measure[] = measures): Recommendation[] {
  if (!places.some((item) => item.id === place) || !defaultQuestions.every((question) => isAnswered(question, answers))) return []
  const equipment = answers.equipment ?? []
  const old = answers.equipmentAge === '6～10年' || answers.equipmentAge === '超過10年'
  const longHours = answers.operatingHours === '9～12小時' || answers.operatingHours === '超過12小時'
  const mismatch = (answers.priority === '空調冷房效果不佳' && !equipment.includes('空調'))
    || (answers.priority === '照明設備老舊' && !equipment.includes('照明'))
  const results: Omit<Recommendation, 'rank' | 'priority'>[] = []

  for (const measure of catalog) {
    const general = measure.equipment === '全場所'
    if (!general && !equipment.some((item) => item === measure.equipment)) continue
    if (measure.kind === 'replacement' && !old && !(measure.equipment === '照明' && answers.priority === '照明設備老舊')) continue
    const reasons: RuleReason[] = []
    const evidence = (field: keyof Answers): AnswerEvidence => ({ field, answer: Array.isArray(answers[field]) ? answers[field].join('、') : answers[field]! })
    const add = (ruleId: string, fields: (keyof Answers)[], explanation: string, points: number, showInReasons = true) => reasons.push({ ruleId, evidence: fields.map(evidence), explanation, points, showInReasons })
    if (general) {
      // 排序基準不偽裝成回答；只有沒有其他觸發理由時才顯示一般管理的保守說明。
      add('general-baseline', [], measure.selectionReason, 10, false)
      if (answers.priority === '電費偏高') add('general-problem', ['priority'], '先建立帳單定期檢視、非營業時間必要用電清單與巡查責任，再確認電費變化原因；目前未確認管理制度是否有缺失。', 25)
      if (answers.priority === '不知道從何開始節能') add('general-problem', ['priority'], '可從必要用電清單、非營業時間巡查與定期帳單檢視開始建立管理流程，先了解現行制度。', 35)
      if (answers.monthlyBill === '10001～30000元' || answers.monthlyBill === '30001元以上') add('bill-records', ['monthlyBill'], '依此電費級距提高帳單盤點順序；級距本身不能證明用電浪費。', 15)
      if (longHours) add('long-operation', ['operatingHours'], longOperationReasons['全場所'], operationPoints['全場所'])
      const unknown = (['monthlyBill', 'operatingHours', 'equipmentAge'] as const).filter((field) => answers[field] === '不清楚')
      if (unknown.length) add('unknown-followup', [...unknown], '這些資料尚未確認，可先指派紀錄責任並補齊資料；不推定為高電費、長時間運轉或老舊設備。', 20)
      if (mismatch) add('equipment-conflict', ['priority', 'equipment'], '改善問題涉及未選設備；先核對問題與設備清單，不直接推薦該設備措施。', 25)
      else if (!equipment.some((item) => item !== '其他')) add('other-equipment', ['equipment'], '尚未指出四類設備，先建立其他設備清單與使用管理責任，不由場所推測設備。', 25)
      if (reasons.length === 1) reasons[0].showInReasons = true
    } else {
      add('selected-equipment', ['equipment'], measure.selectionReason, 40)
      // 設備清單只引用觸發此措施的設備，不重複列出其他已選設備。
      reasons[0].evidence = [{ field: 'equipment', answer: measure.equipment }]
      const directPoints = problemPoints(measure, answers.priority)
      if (directPoints) add('direct-problem', ['priority'], measure.equipment === '空調'
        ? measure.kind === 'inspection' ? '冷房效果不佳與此檢測直接相關，先查冷房需求、出回風及維護狀態，原因尚待確認。' : measure.kind === 'operation' ? '可先核對冷房需求與使用時段是否一致，不能據此確認排程就是冷房不佳的原因。' : '可將實際冷房需求及檢測結果納入更新方案比較；不因主觀冷房問題直接判定應汰換。'
        : measure.kind === 'inspection' ? '你指出照明老舊，可先核對燈具狀態與照明需求，再確認維修或更新方向。' : '你指出照明老舊，可評估符合照明需求的更新方案；實際年限與狀態仍需現場核對。', directPoints)
      if (answers.priority === '設備耗電量高' && measure.kind === 'inspection') add('equipment-diagnosis', ['priority'], diagnosisReasons[measure.equipment], 30)
      if (answers.priority === '設備耗電量高' && measure.kind === 'operation') add('equipment-operation', ['priority'], '設備耗電量高是整體問題回答，將運轉管理列為次於檢測的查核方向；尚不能確認此設備的耗電量異常。', 10)
      if (old && (measure.kind === 'inspection' || measure.kind === 'replacement')) add('age-review', ['equipmentAge'], '整體設備年限回答較長，可核對此設備的個別年限與維修紀錄，再安排檢測或更新評估；不直接判定效率或汰換必要性。', measure.kind === 'inspection' ? 25 : 20)
      if (longHours && measure.kind === 'operation') add('long-operation', ['operatingHours'], longOperationReasons[measure.equipment], operationPoints[measure.equipment])
      const unknownField = measure.kind === 'operation' ? 'operatingHours' : 'equipmentAge'
      if (answers[unknownField] === '不清楚') add('unconfirmed-context', [unknownField], measure.kind === 'operation'
        ? '運轉時數尚未確認，請先記錄此設備的實際使用時段；不據此判定長時間或非必要運轉。'
        : '設備年限尚未確認，先核對此設備的銘牌與維護紀錄；不以未知年限推論老舊或必須汰換。', 0)
    }
    if (measure.investment === '需要設備投資') add('investment-review', [], '此措施涉及設備投資，排序稍後，先檢測及比較方案。', -10, false)
    results.push({ measure, reasons, score: reasons.reduce((sum, reason) => sum + reason.points, 0) })
  }
  const investmentOrder = { '不需新增設備': 0, '視檢測結果評估': 1, '需要設備投資': 2 }
  const kindOrder = { inspection: 0, operation: 1, replacement: 2, management: 3 }
  const categoryOrder = { '空調': 0, '照明': 1, '冷凍冷藏': 2, '空壓': 3, '一般用電管理': 4 }
  return results.sort((a, b) => b.score - a.score
    || investmentOrder[a.measure.investment] - investmentOrder[b.measure.investment]
    || kindOrder[a.measure.kind] - kindOrder[b.measure.kind]
    || categoryOrder[a.measure.category] - categoryOrder[b.measure.category]
    || (a.measure.id < b.measure.id ? -1 : a.measure.id > b.measure.id ? 1 : 0)).map((result, index) => ({
      ...result, rank: index + 1, priority: result.score >= 80 ? '優先檢視' : result.score >= 50 ? '接續安排' : '後續評估',
    }))
}
