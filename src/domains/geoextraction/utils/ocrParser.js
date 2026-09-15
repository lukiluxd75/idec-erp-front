/**
 * Groups raw text blocks from the OCR service into rows/columns of a coordinates table,
 * cleaning text to digits/dots/signs only and splitting "X.XXX Y.YYYY" pairs stuck in the
 * same block when OCR did not detect them as separate cells.
 * Ported as-is from geo-extract/frontend/src/services/ocrService.js.
 */
export function processAndFilterOCRData(blocks) {
  let rowsMap = []

  // Row grouping and smart splitting
  blocks.forEach((block, index) => {
    const yCenter = (block.points[0][1] + block.points[2][1]) / 2
    const xStart = block.points[0][0]
    const xEnd = block.points[1][0]

    let cleanText = block.text || ''
    cleanText = cleanText.replace(/,/g, '.')
    cleanText = cleanText.replace(/[^\d.-]/g, '').trim()
    if (!/\d/.test(cleanText)) {
      cleanText = ''
    }

    let matchedRow = rowsMap.find((r) => Math.abs(r.y - yCenter) < 12)

    if (!matchedRow) {
      matchedRow = {
        id: `row-${Math.random().toString(36).substr(2, 9)}`,
        y: yCenter,
        items: [],
      }
      rowsMap.push(matchedRow)
    }

    let dotCount = (cleanText.match(/\./g) || []).length

    if (dotCount === 2 && cleanText.length > 15) {
      let firstDotIndex = cleanText.indexOf('.')
      let splitIndex = firstDotIndex + 4

      let valX = cleanText.substring(0, splitIndex)
      let valY = cleanText.substring(splitIndex)

      let midX = xStart + (xEnd - xStart) / 2

      matchedRow.items.push({ id: `cell-${index}-a`, text: valX, confidence: block.confidence, xStart: xStart, xEnd: midX - 20 })
      matchedRow.items.push({ id: `cell-${index}-b`, text: valY, confidence: block.confidence, xStart: midX + 20, xEnd: xEnd })
    } else {
      matchedRow.items.push({
        id: `cell-${index}`,
        text: cleanText,
        confidence: block.confidence,
        xStart,
        xEnd,
      })
    }
  })

  rowsMap.forEach((row) => {
    row.items.sort((a, b) => a.xStart - b.xStart)
    let mergedItems = []

    row.items.forEach((item) => {
      if (mergedItems.length === 0) {
        mergedItems.push(item)
      } else {
        let prev = mergedItems[mergedItems.length - 1]
        let gap = item.xStart - prev.xEnd

        // Verificamos si ambos ya tienen punto decimal
        let prevHasDot = prev.text.includes('.')
        let itemHasDot = item.text.includes('.')

        // Only merge if they are close AND are NOT two complete coordinates
        if (gap < 15 && gap > -20 && !(prevHasDot && itemHasDot)) {
          prev.text += (prev.text.endsWith('.') || item.text.startsWith('.') ? '' : ' ') + item.text
          prev.xEnd = Math.max(prev.xEnd, item.xEnd)
          prev.confidence = Math.min(prev.confidence, item.confidence)

          prev.text = prev.text.replace(/[^\d.-]/g, '').trim()
          if (!/\d/.test(prev.text)) {
            prev.text = ''
          }
        } else {
          mergedItems.push(item)
        }
      }
    })
    row.items = mergedItems
  })

  // Column detection (X)
  const allXPositions = []
  rowsMap.forEach((row) => row.items.forEach((item) => allXPositions.push(item.xStart)))
  allXPositions.sort((a, b) => a - b)

  const columnAnchors = []
  if (allXPositions.length > 0) {
    columnAnchors.push(allXPositions[0])
    for (let i = 1; i < allXPositions.length; i++) {
      if (allXPositions[i] - columnAnchors[columnAnchors.length - 1] > 40) {
        columnAnchors.push(allXPositions[i])
      }
    }
  }

  // Final alignment
  rowsMap.forEach((row) => {
    const alignedItems = new Array(columnAnchors.length).fill(null).map((_, i) => ({
      id: `empty-${row.id}-${i}`, text: '', confidence: 1, xStart: columnAnchors[i],
    }))

    row.items.forEach((item) => {
      let closestColIdx = 0
      let minDiff = Math.abs(item.xStart - columnAnchors[0])
      for (let i = 1; i < columnAnchors.length; i++) {
        let diff = Math.abs(item.xStart - columnAnchors[i])
        if (diff < minDiff) { minDiff = diff; closestColIdx = i }
      }
      alignedItems[closestColIdx] = item
    })
    row.items = alignedItems
  })

  rowsMap.sort((a, b) => a.y - b.y)

  rowsMap = rowsMap.filter((row) => {
    return row.items.some((item) => item.text.trim() !== '')
  })

  return rowsMap
}
