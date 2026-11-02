import { measures } from './measures.ts'

// 僅供本機審核及測試，不得由網站元件或推薦規則匯入。
export type MeasureSource =
  | { kind: 'demo'; title: string }
  | { kind: 'manual'; title: string; publisher: string; url: string; section: string; verifiedAt: string; reviewer: string }

export type MeasureReview = { source: MeasureSource; reviewStatus: 'pending' | 'reviewed' }

const demoSource: MeasureSource = { kind: 'demo', title: '本專案內建示範措施；尚未核對官方手冊或其他外部來源' }

export const measureReviews: Readonly<Record<string, MeasureReview>> = Object.fromEntries(
  measures.map(({ id }) => [id, { source: demoSource, reviewStatus: 'pending' }]),
)

export function reviewLabel(measure: MeasureReview): string {
  return measure.reviewStatus === 'reviewed' && measure.source.kind === 'manual'
    && measure.source.title.trim() && measure.source.publisher.trim() && /^https?:\/\//.test(measure.source.url)
    && measure.source.section.trim() && measure.source.verifiedAt.trim() && measure.source.reviewer.trim()
    ? '已核對來源並完成審核' : '示範建議，待專業審核'
}
