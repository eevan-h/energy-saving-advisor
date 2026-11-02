import { useEffect, useRef, useState } from 'react'
import { Assessment } from './components/Assessment'
import { Questionnaire } from './components/Questionnaire'
import { Recommendations } from './components/Recommendations'
import type { PlaceType } from './data/places'
import { getQuestionsForPlace, isAnswered, type Answers } from './data/questions'

const steps = [
  { number: '01', title: '認識你的營業場所', description: '從場所類型出發，了解日常營運的用電需求。' },
  { number: '02', title: '了解設備使用情形', description: '盤點空調、照明與其他設備的使用習慣。' },
  { number: '03', title: '查看節能改善示範建議', description: '確認回答摘要，查看推薦原因與改善方向，待專業人員審核。' },
]

function Leaf({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M26 5C14 3 5 8 6 18c.7 6 8 9 13 5 5-4 5-11 7-18Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 28c2-8 7-14 14-18M12 17l6 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function App() {
  const [page, setPage] = useState<'home' | 'location' | 'questions' | 'summary' | 'recommendations'>('home')
  const [selectedPlace, setSelectedPlace] = useState<PlaceType | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const questions = getQuestionsForPlace(selectedPlace ?? 'office')
  const mainRef = useRef<HTMLElement>(null)
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-4">跳至主要內容</a>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <a href="./" onClick={(event) => { event.preventDefault(); setPage('home') }} aria-label="節能改善指南首頁" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            <span className="rounded-xl bg-emerald-800 p-2 text-white"><Leaf className="size-7" /></span>
            <span className="text-lg font-bold tracking-wide text-emerald-950">節能改善指南</span>
          </a>
          <span className="hidden text-sm text-slate-500 sm:block">為每一間用心經營的小店，開啟節能的第一步</span>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        {page === 'home' ? <>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:py-24" aria-labelledby="hero-title">
          <div>
            <p className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-wider text-emerald-800"><span className="size-2 rounded-full bg-emerald-600" />從日常用電開始，讓節能更有方向</p>
            <h1 id="hero-title" className="max-w-xl text-4xl leading-[1.4] font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.35]">中小微能源用戶<br className="hidden sm:block" /><span className="text-emerald-800">互動式節能改善指南</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">節能，從了解自己的用電開始。<br />陪你盤點營業場所的用電情形，找到適合的改善方向，讓每一度電都用得更好。</p>
            <button type="button" onClick={() => setPage('location')} aria-describedby="assessment-status" className="mt-8 inline-flex min-h-13 cursor-pointer items-center gap-8 rounded-xl bg-emerald-800 px-6 py-4 font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
              開始節能評估 <span aria-hidden="true">→</span>
            </button>
            <p id="assessment-status" className="mt-4 text-sm leading-6 text-slate-500">選擇場所、回答五題，整理你的用電狀況。</p>
          </div>
          <div className="rounded-[2rem] border border-emerald-100 bg-[#edf4ef] px-7 pt-9 pb-7 sm:px-10">
            <div className="flex items-center justify-between text-sm font-medium text-emerald-900"><span>讓節能融入日常</span><Leaf className="size-8" /></div>
            <svg viewBox="0 0 360 250" className="mx-auto my-3 w-full max-w-sm" fill="none" role="img" aria-label="綠色屋簷的小店與兩旁植栽">
              <ellipse cx="180" cy="228" rx="147" ry="12" fill="#dce8df" />
              <rect x="71" y="93" width="219" height="132" rx="5" fill="white" stroke="#27634e" strokeWidth="2" />
              <path d="m61 93 23-48h194l23 48H61Z" fill="#d4e7d8" stroke="#27634e" strokeWidth="2" />
              <path d="m107 45-12 48m58-48-4 48m50-48 4 48m50-48 12 48" stroke="#27634e" strokeWidth="2" />
              <path d="M61 93v10c0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0 0 14 24 14 24 0V93" fill="#79a98a" stroke="#27634e" strokeWidth="2" />
              <rect x="93" y="132" width="103" height="61" rx="3" fill="#eef5ee" stroke="#27634e" strokeWidth="2" />
              <path d="M145 132v61m-52-30h103" stroke="#27634e" strokeWidth="2" />
              <rect x="217" y="132" width="49" height="93" rx="3" fill="#e0eadd" stroke="#27634e" strokeWidth="2" />
              <circle cx="254" cy="180" r="3" fill="#27634e" />
              <path d="M36 209c-19-19-14-37-4-43 16 3 23 19 4 43Zm0 17v-33m286 17c-17-15-16-31-5-39 15 2 21 18 5 39Zm0 16v-30" fill="#a5c5a3" stroke="#27634e" strokeWidth="2" strokeLinecap="round" />
              <path d="m181 12-10 17h10l-5 13 19-20h-12l6-10" fill="#739b54" />
            </svg>
            <div className="rounded-2xl bg-white/85 p-5">
              <p className="font-semibold text-emerald-950">小小改變，也能是好的開始</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">從一盞燈、一台冷氣，到每天的使用習慣，逐步探索節能的可能。</p>
            </div>
          </div>
        </section>
        <section className="border-t border-slate-200 bg-white" aria-labelledby="steps-title">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="steps-title" className="text-2xl font-bold text-slate-900">這樣開始你的節能評估</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">示範版 · 改善建議待專業審核</span>
            </div>
            <ol className="mt-8 grid gap-7 md:grid-cols-3 md:gap-10">
              {steps.map((step) => <li key={step.number} className="border-t border-slate-200 pt-5"><span className="text-sm font-semibold text-emerald-700">{step.number}</span><h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p></li>)}
            </ol>
          </div>
        </section>
        </> : page === 'location' || !selectedPlace ? <Assessment
          selectedPlace={selectedPlace}
          onSelect={setSelectedPlace}
          onBack={() => setPage('home')}
          onNext={() => { if (selectedPlace) { setQuestionIndex(0); setPage('questions') } }}
        /> : page === 'recommendations' ? <Recommendations place={selectedPlace} answers={answers} onBack={() => setPage('summary')} /> : <Questionnaire
          questions={questions}
          index={questionIndex}
          answers={answers}
          place={selectedPlace}
          summary={page === 'summary'}
          onChange={setAnswers}
          onBack={() => {
            if (page === 'summary') { setQuestionIndex(questions.length - 1); setPage('questions') }
            else if (questionIndex === 0) setPage('location')
            else setQuestionIndex(questionIndex - 1)
          }}
          onNext={() => {
            if (!isAnswered(questions[questionIndex], answers)) return
            if (questionIndex < questions.length - 1) setQuestionIndex(questionIndex + 1)
            else {
              const unanswered = questions.findIndex((question) => !isAnswered(question, answers))
              if (unanswered === -1) setPage('summary')
              else setQuestionIndex(unanswered)
            }
          }}
          onEdit={(index) => { setQuestionIndex(index); setPage('questions') }}
          onEditPlace={() => setPage('location')}
          onRecommend={() => { if (questions.every((question) => isAnswered(question, answers))) setPage('recommendations') }}
        />}
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs leading-6 text-slate-500">中小微能源用戶互動式節能改善指南<span className="mx-2" aria-hidden="true">・</span>一起把節能變成日常</footer>
    </div>
  )
}

export default App
