import { alignmentApi } from '../api/alignment.api'

const PADDING_RATIO = 0.15

function bboxFromRing(ring) {
  const lons = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

function invertAffine(t) {
  const det = t.lon.a * t.lat.b - t.lon.b * t.lat.a
  if (!det) throw new Error('La transformación no es invertible.')
  const ia = t.lat.b / det
  const ib = -t.lon.b / det
  const ic = -t.lat.a / det
  const id = t.lon.a / det
  const ie = -(ia * t.lon.c + ib * t.lat.c)
  const iff = -(ic * t.lon.c + id * t.lat.c)
  return { lon: { a: ia, b: ib, c: ie }, lat: { a: ic, b: id, c: iff } }
}

function applyAffine(t, lon, lat) {
  return [t.lon.a * lon + t.lon.b * lat + t.lon.c, t.lat.a * lon + t.lat.b * lat + t.lat.c]
}

function composeAffine(first, second) {
  return {
    a: second.a * first.a + second.c * first.b,
    b: second.b * first.a + second.d * first.b,
    c: second.a * first.c + second.c * first.d,
    d: second.b * first.c + second.d * first.d,
    e: second.a * first.e + second.c * first.f + second.e,
    f: second.b * first.e + second.d * first.f + second.f,
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen WMS.'))
    img.src = src
  })
}

export async function buildCorrectedOverlay({ block, wmsLayer, gisHost, destSize = 1024 }) {
  const ring = block.geom_geojson?.coordinates?.[0]
  if (!ring) throw new Error('La manzana no tiene geometría.')
  if (!wmsLayer?.service) throw new Error(`No se encontró la capa WMS del año ${block.year}.`)

  const [refMinLon, refMinLat, refMaxLon, refMaxLat] = bboxFromRing(ring)
  const inverse = invertAffine(block.transform_params)
  const corners = [
    [refMinLon, refMinLat],
    [refMinLon, refMaxLat],
    [refMaxLon, refMinLat],
    [refMaxLon, refMaxLat],
  ].map(([lon, lat]) => applyAffine(inverse, lon, lat))
  const movLons = corners.map((c) => c[0])
  const movLats = corners.map((c) => c[1])
  const padLon = (Math.max(...movLons) - Math.min(...movLons)) * PADDING_RATIO
  const padLat = (Math.max(...movLats) - Math.min(...movLats)) * PADDING_RATIO
  const movBbox = [
    Math.min(...movLons) - padLon,
    Math.min(...movLats) - padLat,
    Math.max(...movLons) + padLon,
    Math.max(...movLats) + padLat,
  ]

  const sourceObjectUrl = await alignmentApi.fetchWmsImageObjectUrl({
    host: gisHost,
    service: wmsLayer.service,
    bbox: movBbox,
    width: destSize,
    height: destSize,
  })

  let blobUrl
  try {
    const img = await loadImage(sourceObjectUrl)

    // source pixel -> mov geo
    const step1 = {
      a: (movBbox[2] - movBbox[0]) / img.naturalWidth,
      b: 0,
      c: 0,
      d: -(movBbox[3] - movBbox[1]) / img.naturalHeight,
      e: movBbox[0],
      f: movBbox[3],
    }
    // mov geo -> ref geo (the fitted transform itself)
    const step2 = {
      a: block.transform_params.lon.a,
      b: block.transform_params.lat.a,
      c: block.transform_params.lon.b,
      d: block.transform_params.lat.b,
      e: block.transform_params.lon.c,
      f: block.transform_params.lat.c,
    }
    // ref geo -> destination canvas pixel
    const sx = destSize / (refMaxLon - refMinLon)
    const sy = destSize / (refMaxLat - refMinLat)
    const step3 = { a: sx, b: 0, c: 0, d: -sy, e: -refMinLon * sx, f: refMaxLat * sy }

    const combined = composeAffine(composeAffine(step1, step2), step3)

    const canvas = document.createElement('canvas')
    canvas.width = destSize
    canvas.height = destSize
    const ctx = canvas.getContext('2d')
    ctx.setTransform(combined.a, combined.b, combined.c, combined.d, combined.e, combined.f)
    ctx.drawImage(img, 0, 0)

    blobUrl = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('No se pudo generar la imagen corregida.'))
        resolve(URL.createObjectURL(blob))
      })
    })
  } finally {
    URL.revokeObjectURL(sourceObjectUrl)
  }

  return {
    imageUrl: blobUrl,
    bounds: [
      [refMinLat, refMinLon],
      [refMaxLat, refMaxLon],
    ],
  }
}
