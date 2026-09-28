// After the last photo the data still has to be put together (page order, header,
// column A, the optional AI pass). There is no signal for that step, so the bar
// stops here and the screen says what it is doing instead of showing 100%.
const ASSEMBLING_PERCENT = 95

/**
 * How far along the reading of a document is, from the photos the server has
 * already marked as read. It moves one photo at a time on purpose: that is the
 * only thing actually known, and a percentage paced by a clock would either
 * overtake the reading or stall on it.
 */
export function readingProgress(pages) {
  const total = pages.length
  const done = pages.filter((p) => p.status === 'done').length
  const assembling = total > 0 && done === total
  const percent = assembling
    ? ASSEMBLING_PERCENT
    : Math.min(ASSEMBLING_PERCENT, Math.round((done / Math.max(total, 1)) * 100))
  return { percent, done, total, assembling }
}
