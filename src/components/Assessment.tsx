import type { Ref } from 'react'
import { places, type PlaceType } from '../data/places'

type AssessmentProps = {
  headingRef: Ref<HTMLHeadingElement>
  selectedPlace: PlaceType | null
  onSelect: (place: PlaceType) => void
  onBack: () => void
  onNext: () => void
}

const secondaryButton = 'min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700'

export function Assessment({ headingRef, selectedPlace, onSelect, onBack, onNext }: AssessmentProps) {
  const selectedName = places.find((place) => place.id === selectedPlace)?.name

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-16" aria-labelledby="assessment-title">
        <form onSubmit={(event) => { event.preventDefault(); if (selectedPlace) onNext() }}>
          <fieldset>
            <legend className="text-3xl leading-relaxed font-bold text-slate-900 sm:text-4xl"><h1 id="assessment-title" ref={headingRef} tabIndex={-1} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">選擇營業場所類型</h1></legend>
            <p id="place-help" className="mt-3 leading-7 text-slate-600">請選擇最符合你營業場所的類型（單選），作為後續評估的起點。</p>
            <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {places.map((place) => {
                const selected = selectedPlace === place.id
                return (
                  <label key={place.id} className="relative cursor-pointer">
                    <input type="radio" name="place" value={place.id} checked={selected} onChange={() => onSelect(place.id)} required aria-describedby="place-help" className="peer sr-only" />
                    <span className={`grid h-full min-h-24 grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-center gap-x-3 rounded-2xl border-2 p-4 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-emerald-700 sm:flex sm:min-h-48 sm:flex-col sm:items-stretch sm:p-6 ${selected ? 'border-emerald-700 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'}`}>
                      <span className="contents sm:mb-5 sm:flex sm:items-center sm:justify-between sm:gap-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="col-start-1 row-span-2 row-start-1 size-8 self-center text-emerald-800 sm:size-9" aria-hidden="true"><path d={place.path} /></svg>
                        <span aria-hidden="true" className={`col-start-3 row-span-2 row-start-1 flex size-6 items-center justify-center self-center rounded-full border text-sm ${selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'}`}>{selected ? '✓' : ''}</span>
                      </span>
                      <span className="col-start-2 row-start-1 text-lg font-bold text-slate-900">{place.name}</span>
                      <span className="col-start-2 row-start-2 mt-1 text-sm leading-6 text-slate-600 sm:mt-2">{place.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <p id="selection-status" role="status" className="mt-6 text-sm leading-6 text-emerald-900">{selectedName ? `已選擇：${selectedName}` : '請先選擇一種營業場所類型，才能進入下一步。'}</p>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <button type="button" onClick={onBack} className={secondaryButton}>上一步</button>
            <button type="submit" disabled={!selectedPlace} aria-describedby="selection-status" className="min-h-12 cursor-pointer rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">下一步 <span aria-hidden="true">→</span></button>
          </div>
        </form>
    </section>
  )
}

