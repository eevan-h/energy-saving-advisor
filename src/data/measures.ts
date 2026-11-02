import type { PlaceType } from './places'
import type { Answers } from './questions'

export type Equipment = NonNullable<Answers['equipment']>[number]
// 公開措施內容；來源與審核狀態獨立保存在內部 measureReviews.ts。
export type Measure = {
  id: string
  name: string
  category: '空調' | '照明' | '冷凍冷藏' | '空壓' | '一般用電管理'
  equipment: Equipment | '全場所'
  kind: 'inspection' | 'operation' | 'replacement' | 'management'
  selectionReason: string
  suggestions: readonly string[]
  difficulty: '容易' | '中等' | '需專業協助'
  investment: '不需新增設備' | '視檢測結果評估' | '需要設備投資'
  relevantPlaces: readonly PlaceType[]
  matchingProblems: readonly NonNullable<Answers['priority']>[]
}

export const measures: readonly Measure[] = [
  {
    id: 'ac-check', name: '空調清潔與冷房狀況檢查', category: '空調', equipment: '空調', kind: 'inspection',
    selectionReason: '空調需配合實際冷房需求檢查出回風與保養狀態；目前尚未量測冷房能力，不先判定設備故障。',
    suggestions: ['依原廠說明安排濾網清潔，記錄保養日期。', '確認出回風口未被遮擋；冷房效果不佳時，請維護人員檢查並記錄原因，不自行拆修電氣或冷媒系統。'],
    difficulty: '中等', investment: '視檢測結果評估', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['空調冷房效果不佳'],
  },
  {
    id: 'ac-operation', name: '空調分區與運轉排程管理', category: '空調', equipment: '空調', kind: 'operation',
    selectionReason: '空調的使用時段應配合有人活動區域與冷房需求，先核對排程，不假定無人時仍在運轉。',
    suggestions: ['記錄有人使用的區域與時段，檢查空調排程是否符合實際營運需求。', '在不影響舒適、通風及作業需求下，檢討無人區域的運轉設定，由管理人員確認後調整。'],
    difficulty: '容易', investment: '不需新增設備', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['空調冷房效果不佳'],
  },
  {
    id: 'ac-replacement', name: '老舊空調檢測與汰換評估', category: '空調', equipment: '空調', kind: 'replacement',
    selectionReason: '空調更新評估需比較實際冷房需求、設備容量及維修狀況，不能只依整體年限決定汰換。',
    suggestions: ['先核對每台空調的銘牌、維修紀錄與實際設備年限。', '請專業人員量測現況、評估修復與汰換方案，再比較容量、使用需求及報價；勿僅依年限直接汰換。'],
    difficulty: '需專業協助', investment: '需要設備投資', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['空調冷房效果不佳'],
  },
  {
    id: 'lighting-check', name: '照明盤點與老舊燈具檢查', category: '照明', equipment: '照明', kind: 'inspection',
    selectionReason: '照明檢查應先核對各區域的照明需求與燈具狀態；是否照度不足或有故障仍需現場確認。',
    suggestions: ['依區域記錄燈具種類、數量、使用年限與故障情形。', '有閃爍、損壞或照明不足時交由合格人員檢查；評估改善時同時確認工作所需照明及用電安全。'],
    difficulty: '中等', investment: '視檢測結果評估', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['照明設備老舊'],
  },
  {
    id: 'lighting-operation', name: '照明分區與開關時段管理', category: '照明', equipment: '照明', kind: 'operation',
    selectionReason: '照明管理需比對營業時段、無人區域與必要照明需求，先確認開燈情形，不假定目前有多餘照明。',
    suggestions: ['整理營業、清潔及休息時段的照明需求，指定巡查與關燈責任。', '檢討無人區域與自然採光區的開燈需求，保留逃生、保全與作業必要照明。'],
    difficulty: '容易', investment: '不需新增設備', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['照明設備老舊'],
  },
  {
    id: 'lighting-replacement', name: '老舊照明設備更新評估', category: '照明', equipment: '照明', kind: 'replacement',
    selectionReason: '照明更新應依作業所需照度、營業使用時段及燈具相容性評估，先確認個別燈具年限。',
    suggestions: ['先確認燈具狀態、使用時數及照明需求。', '由合格人員評估合適燈具、配線相容性與施工需求，再比較維修及更新方案，不以問答直接決定採購。'],
    difficulty: '需專業協助', investment: '需要設備投資', relevantPlaces: ['office', 'retail', 'service'], matchingProblems: ['照明設備老舊'],
  },
  {
    id: 'refrigeration-check', name: '冷凍冷藏設備巡檢與保養', category: '冷凍冷藏', equipment: '冷凍冷藏', kind: 'inspection',
    selectionReason: '冷凍冷藏需維持品項保存溫度，先檢查門封、散熱與溫度紀錄，尚不能判定有溫度異常。',
    suggestions: ['有門或蓋的冷藏櫃、冷凍櫃，先查看門封是否完整、能否關妥；開放式展示櫃則確認進出風口沒有被貨物遮住。', '保持散熱器周圍通風，依原廠指引安排清潔；記錄溫度異常、明顯結霜及維修情形，請維護人員查明原因。'],
    difficulty: '中等', investment: '視檢測結果評估', relevantPlaces: ['food', 'retail'], matchingProblems: [],
  },
  {
    id: 'refrigeration-operation', name: '冷凍冷藏溫度與開門管理', category: '冷凍冷藏', equipment: '冷凍冷藏', kind: 'operation',
    selectionReason: '冷凍冷藏可能需持續運轉以維持保存溫度，應先核對溫度、開門與補貨管理；不以縮短運轉時間作為預設改善方式。',
    suggestions: ['補貨時依設備標示的堆放範圍放置商品，保持風道暢通；有門的櫃體取放後隨手關妥，避免長時間敞開。', '記錄冷藏庫、冷凍庫或展示櫃的溫度與補貨情形，確認符合食品保存要求及原廠指引；不得為節能任意停機或提高保存溫度。'],
    difficulty: '容易', investment: '不需新增設備', relevantPlaces: ['food', 'retail'], matchingProblems: [],
  },
  {
    id: 'refrigeration-replacement', name: '老舊冷凍冷藏設備檢測與更新評估', category: '冷凍冷藏', equipment: '冷凍冷藏', kind: 'replacement',
    selectionReason: '冷凍冷藏更新需確認持續保存需求、溫度穩定性及維修狀況，不能由年限直接判定保存能力不足。',
    suggestions: ['整理各台設備的溫度、年限與維修紀錄，先請專業人員檢查可修復的問題；設備老舊不代表一定要換新。', '在相同儲存容量與食品保存條件下，比較維修及更新方案；換機前先安排食品暫存，確認新設備達到所需溫度後再放回食品。'],
    difficulty: '需專業協助', investment: '需要設備投資', relevantPlaces: ['food', 'retail'], matchingProblems: [],
  },
  {
    id: 'compressed-air-check', name: '空壓系統洩漏與保養檢查', category: '空壓', equipment: '空壓', kind: 'inspection',
    selectionReason: '空壓檢測可先查核洩漏與供氣壓力是否符合製程需求；尚未量測，不表示已有洩漏或壓力過高。',
    suggestions: ['整理空壓機、管線與用氣設備清單，記錄異常聲響及壓力情形。', '由合格維護人員依安全程序檢查洩漏及保養狀態，不自行拆卸帶壓管路。'],
    difficulty: '需專業協助', investment: '視檢測結果評估', relevantPlaces: ['factory'], matchingProblems: [],
  },
  {
    id: 'compressed-air-operation', name: '空壓供氣與生產時段管理', category: '空壓', equipment: '空壓', kind: 'operation',
    selectionReason: '空壓運轉需比對用氣時段、壓力設定及空載紀錄，先確認製程需求，再評估供氣管理。',
    suggestions: ['比對空壓機運轉紀錄、實際用氣與生產時段，確認待機或空載情形。', '由現場負責人評估非生產時段的供氣需求；調整前確認安全、製程及設備要求。'],
    difficulty: '中等', investment: '不需新增設備', relevantPlaces: ['factory'], matchingProblems: [],
  },
  {
    id: 'compressed-air-replacement', name: '老舊空壓設備檢測與汰換評估', category: '空壓', equipment: '空壓', kind: 'replacement',
    selectionReason: '空壓更新需在確認洩漏、實際用氣量與壓力需求後評估，避免未查明管路及管理問題就汰換設備。',
    suggestions: ['整理運轉時數、保養紀錄與實際用氣需求。', '由專業人員檢測後比較維修及更新方案，確認容量與製程相容性；勿僅依年限判定效率。'],
    difficulty: '需專業協助', investment: '需要設備投資', relevantPlaces: ['factory'], matchingProblems: [],
  },
  {
    id: 'energy-management', name: '建立電費與設備用電紀錄', category: '一般用電管理', equipment: '全場所', kind: 'management',
    selectionReason: '可先建立非營業時間的必要用電清單、巡查責任與定期帳單檢視制度；目前未詢問管理制度，不判定現有管理缺失。',
    suggestions: ['整理近期帳單的用電度數、計費天數與電費，搭配營業時段及設備清單記錄。', '建立非營業時間的必要用電清單與巡查責任，保留冷凍冷藏、保全及安全必要設備的運轉；確認現有管理制度後再調整。', '釐清尚未確認的設備年限與運轉時數，定期比較相近營運條件的紀錄，再交由專業人員確認改善方向。'],
    difficulty: '容易', investment: '不需新增設備', relevantPlaces: [], matchingProblems: ['電費偏高', '不知道從何開始節能'],
  },
]

