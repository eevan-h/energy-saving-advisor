import { useEffect, useRef } from 'react'
import { places, type PlaceType } from '../data/places'
import { formatAnswer, isAnswered, type Answers, type Question } from '../data/questions'

type QuestionnaireProps = {
  questions: readonly Question[]
  index: number
  answers: Answers
  place: PlaceType
  summary: boolean
  onChange: (answers: Answers) => void
  onBack: () => void
  onNext: () => void
  onEdit: (index: number) => void
  onEditPlace: () => void
  onRecommend: () => void
}

const backButton = 'min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700'

export function Questionnaire({ questions, index, answers, place, summary, onChange, onBack, onNext, onEdit, onEditPlace, onRecommend }: QuestionnaireProps) {
  const question = questions[index]
  const titleRef = useRef<HTMLHeadingElement>(null)
  const placeName = places.find((item) => item.id === place)?.name
  const completed = questions.filter((item) => isAnswered(item, answers)).length

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [index, summary])

  function selectOption(option: Question['options'][number]) {
    if (question.type === 'multiple') {
      // 以題目本身的選項縮限型別，避免寫入不屬於此題的答案。
      const equipment = question.options.find((value) => value === option)
      if (!equipment) return
      const current = answers.equipment ?? []
      onChange({ ...answers, equipment: current.includes(equipment) ? current.filter((value) => value !== equipment) : [...current, equipment] })
    } else {
      // 由目前題目的選項產生欄位更新；不接受外部任意字串。
      if (question.options.some((value) => value === option)) onChange({ ...answers, [question.id]: option })
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-16" aria-labelledby="questionnaire-title">
      <p className="mb-4 text-sm font-semibold text-emerald-800">營業場所：{placeName}</p>
      <h1 id="questionnaire-title" ref={titleRef} tabIndex={-1} className="text-3xl leading-relaxed font-bold text-slate-900 outline-none sm:text-4xl">{summary ? '用電狀況回答摘要' : '用電狀況問答'}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{summary ? '請確認場所類型與全部回答，也可以返回修改。' : '依照實際使用情形回答，逐步整理你的用電狀況。'}</p>
      <div className="mt-6 flex justify-between gap-4 text-sm text-slate-600"><span>{summary ? '已完成問答' : `第 ${index + 1} 題，共 ${questions.length} 題`}</span><span>已回答 {completed}／{questions.length} 題</span></div>
      <progress aria-label="已回答題數" value={completed} max={questions.length} className="mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-700 [&::-moz-progress-bar]:bg-emerald-700" />
      {summary ? (
        <>
          <dl className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7">
            <div className="py-5"><dt className="font-semibold text-slate-900">營業場所類型</dt><dd className="mt-2 flex flex-wrap items-center justify-between gap-3 text-emerald-900"><span>{placeName}</span><button type="button" onClick={onEditPlace} className={backButton} aria-label="修改營業場所類型">修改</button></dd></div>
            {questions.map((item, questionIndex) => <div key={item.id} className="py-5"><dt className="font-semibold text-slate-900">{questionIndex + 1}. {item.title}</dt><dd className="mt-2 flex flex-wrap items-center justify-between gap-3 text-emerald-900"><span className="leading-7">{formatAnswer(item, answers)}</span><button type="button" onClick={() => onEdit(questionIndex)} className={backButton} aria-label={`修改${item.title}`}>修改</button></dd></div>)}
          </dl>
          <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">確認回答後，可查看規則式節能改善示範建議。建議尚待專業審核，不提供節電率、金額或回收年限估算。</p>
          <div className="mt-6 flex flex-wrap justify-between gap-4">
            <button type="button" onClick={onBack} className={backButton}>上一步</button>
            <button type="button" onClick={onRecommend} disabled={completed !== questions.length} className="min-h-12 cursor-pointer rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">查看節能改善建議</button>
          </div>
        </>
      ) : (
        <form key={question.id} onSubmit={(event) => { event.preventDefault(); if (isAnswered(question, answers)) onNext() }} className="mt-8">
          <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <legend className="px-2 text-xl leading-relaxed font-bold text-slate-900">{index + 1}. {question.title}</legend>
            <p id="answer-help" className="mb-5 text-sm text-slate-500">{question.type === 'multiple' ? '可複選，請至少選擇一項。' : '單選，請選擇一項。'}</p>
            <div className="grid gap-3">
              {question.options.map((option) => {
                const answer = answers[question.id]
                const checked = Array.isArray(answer) ? answer.some((value) => value === option) : answer === option
                return <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700 ${checked ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'}`}><input type={question.type === 'multiple' ? 'checkbox' : 'radio'} name={question.id} value={option} checked={checked} onChange={() => selectOption(option)} aria-describedby="answer-help" className="size-5 shrink-0 accent-emerald-700" /><span className="leading-7">{option}</span></label>
              })}
            </div>
          </fieldset>
          <p id="answer-status" role="status" className="mt-5 text-sm leading-6 text-slate-600">{isAnswered(question, answers) ? '已回答，可繼續下一步。' : '請先回答本題，才能進入下一步。'}</p>
          <div className="mt-5 flex justify-between gap-4 border-t border-slate-200 pt-6">
            <button type="button" onClick={onBack} className={backButton}>上一步</button>
            <button type="submit" disabled={!isAnswered(question, answers)} aria-describedby="answer-status" className="min-h-12 cursor-pointer rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{index === questions.length - 1 ? '查看回答摘要' : '下一步'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
