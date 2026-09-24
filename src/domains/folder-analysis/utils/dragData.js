// A photo dragged from the inbox carries its capture id under this type.
export const CAPTURE_DRAG_TYPE = 'application/x-idec-capture'

export function setDraggedCapture(event, captureId) {
  event.dataTransfer.setData(CAPTURE_DRAG_TYPE, captureId)
  event.dataTransfer.effectAllowed = 'move'
}

export function isCaptureDrag(event) {
  return Array.from(event.dataTransfer.types || []).includes(CAPTURE_DRAG_TYPE)
}

export function getDraggedCapture(event) {
  return event.dataTransfer.getData(CAPTURE_DRAG_TYPE) || null
}
