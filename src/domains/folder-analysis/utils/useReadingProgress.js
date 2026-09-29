import { useEffect, useRef, useState } from 'react'

import {
  finishedDuration,
  pagesDone,
  readingPhase,
  readingProgress,
} from '@/domains/folder-analysis/utils/readingProgress'
import {
  perPageEstimate,
  queueWaitEstimate,
  recordReading,
} from '@/domains/folder-analysis/utils/readingStats'

// The board polls every few seconds; the bar is redrawn far more often than that,
// which is what makes it move instead of stepping.
const TICK_MS = 250

// A document whose start is further back than this is a clock out of step between
// the server and this computer, not a reading that has been running for hours.
const MAX_SERVER_OFFSET_SEC = 2 * 60 * 60

/**
 * When this run started, in this computer's clock: now, minus what the server
 * says had already elapsed. Taking the elapsed time this way instead of comparing
 * clocks keeps a computer whose time is off from showing a reading that started
 * "before" the screen opened -- or one that has been running for days.
 */
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
  // The bar only ever moves forward: a poll that answers with a board from a
  // moment ago must not pull it back.
  const floor = Math.max(timing.floor, progress.percent)
  return {
    floor,
    view: { ...progress, percent: Math.round(progress.phase === 'done' ? 100 : floor), samples },
  }
}

/**
 * Follows one document's analysis: the stage it is in, a bar that keeps moving
 * between the server's answers, how long it has been running and how long it
 * still needs.
 */
export function useReadingProgress(document) {
  // Everything that has to survive a poll -- when the run started, when the
  // current stage started, how far the bar already went -- lives here, and is
  // only ever touched from the effects below.
  const timing = useRef(null)
  // The first paint already places the bar where the run is, so a document that
  // was already being analyzed when the screen opened does not start over at zero.
  const [view, setView] = useState(() => {
    const now = Date.now()
    return snapshot(document, { startedAt: startedFrom(document, now), stepAt: now, floor: 0 }, now).view
  })

  const phase = readingPhase(document)
  const live = phase === 'queued' || phase === 'reading' || phase === 'assembling'
  // A re-analysis moves `analyzed_at`: that is a new run, with its own clock and
  // its own bar starting from zero.
  const runKey = `${document?.id || ''}:${document?.analyzed_at || ''}`
  const stepKey = `${phase}:${pagesDone(document)}`

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
  // Measured once per run: the finished document keeps arriving with every poll.
  const measured = useRef(null)
  useEffect(() => {
    if (phase !== 'done' || measured.current === runKey) return
    measured.current = runKey
    recordReading(document)
  }, [document, phase, runKey])

  return view
}
