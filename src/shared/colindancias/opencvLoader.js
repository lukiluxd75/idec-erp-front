/**
 * Único punto de carga de OpenCV (@techstark/opencv-js), compartido entre
 * módulos y dominios (planNorthDetector.js aquí mismo, y
 * resolutions/utils/tableLineDetector.js). Se importa con import() dinámico
 * desde getCv(), así los varios MB de OpenCV no entran al bundle principal.
 *
 * Por qué este módulo intermedio en vez de `import('@techstark/opencv-js')`
 * directo (verificado en Chrome, 2026-09-25):
 *   - En el build de producción, el paquete (UMD/CommonJS) queda envuelto en
 *     un módulo que re-exporta las propiedades de su default -- una Promise --
 *     incluido `then`. import() resuelve su promesa con ese namespace, lo toma
 *     por "thenable" y revienta con "Promise.prototype.then called on
 *     incompatible receiver". Acá se importa de forma ESTÁTICA (sin esa
 *     adopción de promesas) y lo que sale por import() es este módulo, que no
 *     tiene `then`.
 *   - En desarrollo (vite dev) el namespace llega vacío y la librería queda
 *     en window.cv.
 * En los dos casos lo que se obtiene es una Promise que resuelve al objeto cv
 * cuando termina de inicializarse el WASM.
 */
import * as opencvModulo from '@techstark/opencv-js'

export function obtenerCv() {
  return opencvModulo.default ?? globalThis.cv
}
