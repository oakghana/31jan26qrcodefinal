export type GeoPos = { latitude: number; longitude: number; accuracy?: number }

export async function getBestLocation({ enableHighAccuracy = false, timeout = 8000 } = {}): Promise<GeoPos> {
  if (!('geolocation' in navigator)) throw new Error('Geolocation not supported')

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Geolocation timeout'))
    }, timeout)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
      },
      (err) => {
        clearTimeout(timer)
        let msg = 'Unable to determine location'
        if (err && typeof err.code === 'number') {
          if (err.code === 1) msg = 'Location permission denied'
          else if (err.code === 2) msg = 'Position unavailable'
          else if (err.code === 3) msg = 'Location request timed out'
        }
        reject(new Error(msg))
      },
      { enableHighAccuracy, maximumAge: 5000, timeout },
    )
  })
}

let watchId: number | null = null
export function startLocationWatch(onUpdate: (coords: GeoPos) => void) {
  if (!('geolocation' in navigator)) return () => {}
  if (watchId) navigator.geolocation.clearWatch(watchId)
  watchId = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 },
  )
  return () => {
    if (watchId) navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}
