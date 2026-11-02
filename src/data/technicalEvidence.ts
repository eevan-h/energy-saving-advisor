// 公開畫面只使用核對後的書目與轉述，不匯入PDF、本機路徑或下載網址。
// 完整比對及歷史C類關聯保留在docs；本檔是網站技術依據的單一資料入口。
export type SupportLevel = 'A' | 'B'
export type PageRange = readonly [start: number, end?: number]
export type PageLocator = { pdf: PageRange; printed: PageRange }
type TechnicalSource = { title: string; attribution: string; edition: string }

export const technicalSources = {
  'SRC-002': {
    title: '壓縮空氣供氣系統節能手冊',
    attribution: '封面署名：財團法人中技社節能技術發展中心；發布機關待查證。',
    edition: '出版年份、版次待查證。',
  },
  'SRC-003': {
    title: '壓縮空氣系統能源查核及節約能源案例手冊',
    attribution: '封面委託單位：經濟部能源局；執行單位：工業技術研究院。此為原文件署名。',
    edition: '出版年份、版次待查證。',
  },
} as const satisfies Record<string, TechnicalSource>

export const supportLabels: Record<SupportLevel, string> = {
  A: 'A｜核心有直接文獻依據',
  B: 'B｜部分支持',
}
export const supportDisclaimer = 'A 僅代表核心作法有直接文獻依據，不代表所有細節已驗證或專業審核通過；B 代表部分支持，仍有證據缺口。'
export const evidenceDisclaimer = '以下為文件內容轉述與專案整理，不是手冊逐字原文或現場作業指導書。歷史節電率、金額與回收年限不得作為通用效益；現行標準及安全程序仍待查證。'

export type TechnicalReference = {
  sourceId: keyof typeof technicalSources
  support: SupportLevel
  pages: readonly PageLocator[]
  summary: string
  rationale: string
  limitations: string
}
export type TechnicalEvidence = {
  references: readonly TechnicalReference[]
  precautions: readonly string[]
  pending: string
}
type AirMeasureId = 'compressed-air-check' | 'compressed-air-operation' | 'compressed-air-replacement'

export const technicalEvidence: Readonly<Record<AirMeasureId, TechnicalEvidence>> = {
  'compressed-air-check': {
    references: [
      {
        sourceId: 'SRC-002', support: 'A',
        pages: [{ pdf: [15, 19], printed: [13, 17] }, { pdf: [48, 50], printed: [43, 45] }, { pdf: [52, 53], printed: [47, 48] }],
        summary: '第3章記錄設備規格與操作壓力並進行效率、洩漏測試；測試拆裝前有關電、管線隔離與洩壓步驟。第6.2節以超音波找漏、標示後安排檢修，後續內容討論壓損及過濾器保養。',
        rationale: '設備資料、壓力與洩漏檢測及保養有具體程序，支持核心檢查方向。',
        limitations: '孔口流量、電力量測及管線拆裝屬專業作業；異常聲響的判讀與人員資格未完整核實。歷史洩漏比例不能當作現場已存在的洩漏量。',
      },
      {
        sourceId: 'SRC-003', support: 'A',
        pages: [{ pdf: [13], printed: [10] }, { pdf: [43, 44], printed: [40, 41] }, { pdf: [48, 49], printed: [45, 46] }],
        summary: '保養管理依原廠時程，日常點檢記錄壓力、空重車時數與警報；工程與保養人員須有相應專業訓練。洩漏防治包含定量、偵測、定位、處理驗證與持續管理。',
        rationale: '點檢紀錄、保養及洩漏防治有可定位的管理步驟，支持核心作法。',
        limitations: '日常表也含電流、電壓及震動等專業量測，不能全部交由未受訓者操作；原文提及立即檢修，不等於允許帶壓拆修。',
      },
    ],
    precautions: [
      '一般巡檢限於安全可接近處的觀察、讀取既有儀表及記錄異常；儀器檢漏、電氣量測與拆修交由具資格或受訓且獲授權的人員。',
      '涉及拆裝時，須依原廠與現場程序停機、隔離並確認洩壓，不自行拆卸帶壓管路；本頁不提供拆修步驟。',
    ],
    pending: '異常聲響判讀、人員資格、現行安全規範、隔離與復歸程序、個別機型保養週期待查證。',
  },
  'compressed-air-operation': {
    references: [
      {
        sourceId: 'SRC-002', support: 'B',
        pages: [{ pdf: [20, 22], printed: [18, 20] }, { pdf: [26], printed: [24] }, { pdf: [32, 33], printed: [30, 31] }],
        summary: '選型考量用氣量、品質與工作壓力；供氣壓力須配合現場用氣設備。多機調度章說明卸載仍耗電，並以運轉數據及供氣監控資訊安排啟停。',
        rationale: '支持量測及依需求調度，但未完整交代生產班表比對、非生產必要供氣及停復機程序。',
        limitations: '多機並聯情境不能直接套用所有單機系統；不能按每日運轉時數直接降壓或停供。',
      },
      {
        sourceId: 'SRC-003', support: 'A',
        pages: [{ pdf: [11], printed: [8] }, { pdf: [38, 39], printed: [35, 36] }, { pdf: [50, 51], printed: [47, 48] }, { pdf: [55], printed: [52] }],
        summary: '各用氣時段耗氣量應與供氣量配合，依尖峰、平均需求及歷史運轉紀錄建立負載曲線；控制章區分順序輪替與多機連鎖，舊系統應尋求專業診斷。',
        rationale: '用氣時段、負載曲線與空車控制直接對應紀錄比對及供氣需求評估的核心。',
        limitations: '輪替開機順序不保證節能；控制與變頻須核對機型及相容性。非生產必要供氣仍需現場確認，不能一律下班停機。',
      },
    ],
    precautions: [
      '調壓、停供或調整啟停前，先確認末端最低壓力、用氣品質、尖峰需求及必要供氣，不得影響製程與安全。',
      '先比對生產與非生產時段的實際用氣，再由現場負責人與專業人員確認可行安排；變頻依負載曲線、機型與原廠性能評估。',
    ],
    pending: '非生產必要用氣清單、壓力及品質下限、停復機與備援程序、控制相容性待現場確認；現行安全要求待查證。',
  },
  'compressed-air-replacement': {
    references: [
      {
        sourceId: 'SRC-002', support: 'B',
        pages: [{ pdf: [15, 17], printed: [13, 15] }, { pdf: [20, 22], printed: [18, 20] }, { pdf: [29, 30], printed: [27, 28] }],
        summary: '效率須用儀器實測，不能只靠保養紀錄；依用氣量、品質、工作壓力及需求變化選型。外加變頻與原設計變頻試驗機的性能不同，變頻應用受機體設計影響。',
        rationale: '支持檢測與需求導向選型，但完整的維修／更新方案比較方法不足。',
        limitations: '沒有按固定年限汰換的門檻；試驗機轉速、負載與性能曲線不能當所有機型的通用條件。',
      },
      {
        sourceId: 'SRC-003', support: 'B',
        pages: [{ pdf: [11], printed: [8] }, { pdf: [38], printed: [35] }, { pdf: [44], printed: [41] }, { pdf: [50, 51], printed: [47, 48] }, { pdf: [55], printed: [52] }],
        summary: '年度系統管理先做效能檢測，再依結果調整開機順序及進行必要汰換；選型與需求調查考量用途、壓力、平均及尖峰用量與品質，舊系統由專家團隊診斷。',
        rationale: '有先檢測再評估必要更新的依據，但維修／更新成本、報價與可靠度的完整比較程序未補足，因此維持B。',
        limitations: '案例效益不能作為本案預測；設備老舊不等於必須汰換，也不支持無條件改用變頻。',
      },
    ],
    precautions: [
      '勿僅依設備老舊或問答年限決定汰換；先由專業人員量測並釐清洩漏、壓損及可修復問題，再比較維修、控制改善與必要更新。',
      '變頻須依實際負載、機型、原廠性能與相容性評估；容量與供氣品質須符合製程及安全需求。',
    ],
    pending: '維修／更新技術方案、當前報價、可靠度與備援比較、負載量測、驗收方法及現行標準待查證。',
  },
}

export function getTechnicalEvidence(measureId: string): TechnicalEvidence | undefined {
  return Object.hasOwn(technicalEvidence, measureId) ? technicalEvidence[measureId as AirMeasureId] : undefined
}

export function formatPageRange([start, end]: PageRange): string {
  return end === undefined ? `${start}` : `${start}～${end}`
}
