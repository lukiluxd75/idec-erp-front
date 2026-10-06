import { useEffect, useRef, useState } from 'react'

import {
  finishedDuration,
  isLive,
  pagesDone,
  readingPhase,
  readingProgress,
} from '@/domains/folder-analysis/utils/readingProgress'
import {
  perPageEstimate,
  queueWaitEstimate,
  recordReading,
} from '@/domains/folder-analysis/utils/readingStats'

const TICK_MS = 250

const MAX_SERVER_OFFSET_SEC = 2 * 60 * 60

/** When this run started, in this computer's clock: now, minus what the server says had already elapsed. */
function startedFrom(document, now) {
  const started = Date.parse(document?.analyzed_at || '')
  const onServer = Number.isFinite(started) ? (now - started) / 1000 : 0
  const offset = onServer > 0 && onServer < MAX_SERVER_OFFSET_SEC ? onServer : 0
  return now - offset * 1000
}

/** The bar as it is drawn right now, and the floor it may never go under again. */
function snapshot(document, timing, now) {
  const { seconds: perPageSec, samples } = perPageEstimate(document?.doc_type)
  const progress = readingProgress(document, {
    // A run that ended keeps the time it took, not the time since it started.
    elapsedSec: finishedDuration(document) ?? (now - timing.startedAt) / 1000,
    stepElapsedSec: (now - timing.stepAt) / 1000,
    perPageSec,
    queueWaitSec: queueWaitEstimate(document?.doc_type),
  })
  // The bar only ever moves forward: a poll that answers with a board from a moment ago must not pull it back.
  const floor = Math.max(timing.floor, progress.percent)
  return {
    floor,
    view: { ...progress, percent: Math.round(progress.phase === 'done' ? 100 : floor), samples },
  }
}

export function useReadingProgress(document) {
  const timing = useRef(null)
  const [view, setView] = useState(() => {
    const now = Date.now()
    return snapshot(document, { startedAt: startedFrom(document, now), stepAt: now, floor: 0 }, now).view
  })

  const phase = readingPhase(document)
  const live = isLive(phase)
  // A re-analysis moves `analyzed_at`: that is a new run, with its own clock and its own bar starting from zero.
  const runKey = `${document?.id || ''}:${document?.analyzed_at || ''}`
  const stepKey = `${phase}:${document?.stage || ''}:${pagesDone(document)}`

  useEffect(() => {
    const now = Date.now()
    const previous = timing.current
    if (previous === null || previous.runKey !== runKey) {
      timing.current = { runKey, stepKey, startedAt: startedFrom(document, now), stepAt: now, floor: 0 }
    } else if (previous.stepKey !== stepKey) {
      timing.current = { ...previous, stepKey, stepAt: now }
    }

    const tick = () => {
      const { floor, view: next } = snapshot(document, timing.current, Date.now())
      timing.current = { ...timing.current, floor }
      setView(next)
    }

    tick()
    if (!live) return undefined
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [document, runKey, stepKey, live])

  // Every finished reading teaches the next estimate how long this lane takes.
  const measured = useRef(null)
  useEffect(() => {
    if (phase !== 'done' || measured.current === runKey) return
    measured.current = runKey
    recordReading(document)
  }, [document, phase, runKey])

  return view
}
