import { places, type PlaceType } from '../data/places'
import { defaultQuestions, type Answers } from '../data/questions'
import { recommend, type AnswerEvidence } from '../lib/recommendations'

type RecommendationsProps = { place: PlaceType; answers: Answers; onBack: () => void }

function evidenceText(evidence: AnswerEvidence[]): string {
  return evidence.map(({ field, answer }) => `${defaultQuestions.find((question) => question.id === field)?.title}：「${answer}」`).join('；')
}

export function Recommendations({ place, answers, onBack }: RecommendationsProps) {
  // 每次依目前答案重新推導，返回修改後不沿用過期結果。
  const results = recommend(place, answers)
  const placeName = places.find((item) => item.id === place)?.name
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-16" aria-labelledby="recommendations-title">
      <p className="mb-4 text-sm font-semibold text-emerald-800">營業場所：{placeName}</p>
      <h1 id="recommendations-title" className="text-3xl leading-relaxed font-bold text-slate-900 sm:text-4xl">節能改善措施推薦</h1>
      <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">以下為初步改善建議，請依現場狀況確認；涉及設備維修或調整時，請找專業人員協助。</p>
      <h2 className="mt-8 text-xl font-bold text-slate-900">{results.length ? `${results.length} 項建議，依改善優先順序排列` : '請先完成問答'}</h2>
      {!results.length && <p className="mt-4 text-slate-600">回答尚未完整或格式不正確，請返回摘要確認資料。</p>}
      <ol className="mt-5 space-y-6">
        {results.map(({ measure, reasons, rank, priority }) => (
          <li key={measure.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">第 {rank} 順位 · {priority}</span></div>
            <h3 className="mt-4 text-xl leading-relaxed font-bold text-slate-900">{measure.name}</h3>
            <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">改善難易度</dt><dd className="mt-1 font-medium text-slate-900">{measure.difficulty}</dd></div>
              <div><dt className="text-slate-500">設備投資需求</dt><dd className="mt-1 font-medium text-slate-900">{measure.investment}</dd></div>
            </dl>
            <h4 className="mt-6 font-semibold text-emerald-950">為什麼推薦給你</h4>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
              {reasons.filter((reason) => reason.showInReasons).map((reason) => <li key={reason.ruleId}>{reason.evidence.length > 0 && <span className="font-medium text-slate-800">{evidenceText(reason.evidence)}。</span>}{reason.explanation}</li>)}
            </ul>
            <h4 className="mt-6 font-semibold text-emerald-950">具體建議</h4>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">{measure.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
            {measure.category === '冷凍冷藏' && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600">食品安全優先，勿自行更改除霜或安全保護設定；冷媒、電氣與壓力系統維修請交由專業人員。</p>}
            {measure.category === '空壓' && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600">勿拆卸帶壓管路；調壓或停供前，請專業人員確認製程與安全需求。</p>}
            {(measure.category === '空調' || measure.category === '照明') && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600">用電設備請依原廠指引使用，電氣維修請交由專業人員，勿自行拆修。</p>}
          </li>
        ))}
      </ol>
      <button type="button" onClick={onBack} className="mt-8 min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">返回回答摘要／修改答案</button>
    </section>
  )
}
