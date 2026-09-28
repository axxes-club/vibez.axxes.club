"use client"

// Fills the lat/lng inputs of the surrounding form with this device's location
export function LocationButton() {
  return (
    <button
      type="button"
      className="btn-ghost shrink-0"
      title="Use my current location"
      onClick={(e) => {
        const form = e.currentTarget.closest("form")
        navigator.geolocation?.getCurrentPosition((p) => {
          const lat = form?.querySelector<HTMLInputElement>('input[name="geoLat"]')
          const lng = form?.querySelector<HTMLInputElement>('input[name="geoLng"]')
          if (lat) lat.value = p.coords.latitude.toFixed(6)
          if (lng) lng.value = p.coords.longitude.toFixed(6)
        })
      }}
    >
      📍
    </button>
  )
}
