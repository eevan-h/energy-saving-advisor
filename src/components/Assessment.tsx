import { places, type PlaceType } from '../data/places'

type AssessmentProps = {
  selectedPlace: PlaceType | null
  onSelect: (place: PlaceType) => void
  onBack: () => void
  onNext: () => void
}

const secondaryButton = 'min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700'

export function Assessment({ selectedPlace, onSelect, onBack, onNext }: AssessmentProps) {
  const selectedName = places.find((place) => place.id === selectedPlace)?.name

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-16" aria-labelledby="assessment-title">
        <form onSubmit={(event) => { event.preventDefault(); if (selectedPlace) onNext() }}>
          <fieldset>
            <legend id="assessment-title" className="text-3xl leading-relaxed font-bold text-slate-900 sm:text-4xl">選擇營業場所類型</legend>
            <p id="place-help" className="mt-3 leading-7 text-slate-600">請選擇最符合你營業場所的類型（單選），作為後續評估的起點。</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => {
                const selected = selectedPlace === place.id
                return (
                  <label key={place.id} className="relative cursor-pointer">
                    <input type="radio" name="place" value={place.id} checked={selected} onChange={() => onSelect(place.id)} required aria-describedby="place-help" className="peer sr-only" />
                    <span className={`flex h-full min-h-48 flex-col rounded-2xl border-2 p-6 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-emerald-700 ${selected ? 'border-emerald-700 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'}`}>
                      <span className="mb-5 flex items-center justify-between gap-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-9 text-emerald-800" aria-hidden="true"><path d={place.path} /></svg>
                        <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border text-sm ${selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'}`}>{selected ? '✓' : ''}</span>
                      </span>
                      <span className="text-lg font-bold text-slate-900">{place.name}</span>
                      <span className="mt-2 text-sm leading-6 text-slate-600">{place.description}</span>
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

