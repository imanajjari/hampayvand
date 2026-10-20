import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet'

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng, label: `نقطهٔ انتخاب‌شده (${event.latlng.lat.toFixed(4)}، ${event.latlng.lng.toFixed(4)})` })
    },
  })
  return null
}

function Recenter({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point?.lat && point?.lng) map.setView([point.lat, point.lng], map.getZoom())
  }, [point?.lat, point?.lng, map])
  return null
}

export default function MapPicker({ point, onChange }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={[point?.lat || 35.6892, point?.lng || 51.389]} zoom={11} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Recenter point={point} />
        <CircleMarker center={[point?.lat || 35.6892, point?.lng || 51.389]} radius={9} pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.85, weight: 3 }} />
      </MapContainer>
    </div>
  )
}
