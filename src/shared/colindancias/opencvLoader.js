import * as opencvModulo from '@techstark/opencv-js'

export function obtenerCv() {
  return opencvModulo.default ?? globalThis.cv
}
