import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip } from '../types';
import { Loader2 } from 'lucide-react';

const CATEGORY_COLOR: Record<string, string> = {
  food:          '#f97316',
  sightseeing:   '#3b82f6',
  activity:      '#22c55e',
  transport:     '#6b7280',
  accommodation: '#a855f7',
  free:          '#14b8a6',
};

const CATEGORY_EMOJI: Record<string, string> = {
  food:          '🍴',
  sightseeing:   '🏛️',
  activity:      '🎯',
  transport:     '🚌',
  accommodation: '🏨',
  free:          '⏸️',
};

function makeIcon(category: string) {
  const color = CATEGORY_COLOR[category] ?? '#6366f1';
  const emoji = CATEGORY_EMOJI[category] ?? '📍';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:15px">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

interface ControllerProps {
  positions: [number, number][];
  fallback: [number, number] | null;
  posKey: string;
}

function MapController({ positions, fallback, posKey }: ControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50], animate: true, duration: 0.7 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14, { animate: true, duration: 0.7 });
    } else if (fallback) {
      map.setView(fallback, 12, { animate: true, duration: 0.7 });
    }
  // posKey is a stable string derived from positions, used as dep instead of the array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, fallback?.[0], fallback?.[1]]);

  return null;
}

interface Props {
  trip: Trip;
}

export default function TripMap({ trip }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [geocodedCenter, setGeocodedCenter] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const hasAnyCoords = trip.itinerary.some(d => d.activities.some(a => a.lat && a.lng));

  // Geocode the destination when no activity coordinates exist
  useEffect(() => {
    if (hasAnyCoords) return;
    setGeocoding(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trip.destination)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then(r => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (data[0]) setGeocodedCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  }, [trip.destination, hasAnyCoords]);

  // Flat list of all activities with their day metadata
  const allActivities = trip.itinerary.flatMap(d =>
    d.activities.map(a => ({ ...a, dayId: d.id, dayDate: d.date, dayTitle: d.title }))
  );

  const filtered = selectedDay
    ? allActivities.filter(a => a.dayId === selectedDay)
    : allActivities;

  const mapped = filtered.filter(a => a.lat && a.lng);
  const positions: [number, number][] = mapped.map(a => [a.lat!, a.lng!]);
  const posKey = positions.map(p => `${p[0]},${p[1]}`).join('|');

  const noItinerary = trip.itinerary.length === 0;

  return (
    <div className="space-y-4">

      {/* Day selector */}
      {trip.itinerary.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedDay(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              selectedDay === null
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All days
          </button>
          {trip.itinerary.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id === selectedDay ? null : d.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedDay === d.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div
        className="relative rounded-2xl overflow-hidden border border-gray-800"
        style={{ height: '460px' }}
      >
        {geocoding && (
          <div className="absolute inset-0 bg-gray-900/80 z-[500] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-sm text-gray-400">Locating {trip.destination}…</span>
          </div>
        )}

        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController positions={positions} fallback={geocodedCenter} posKey={posKey} />

          {mapped.map(a => (
            <Marker
              key={`${a.id}-${a.dayId}`}
              position={[a.lat!, a.lng!]}
              icon={makeIcon(a.category)}
            >
              <Popup>
                <div className="text-gray-800 text-sm" style={{ minWidth: '180px' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{CATEGORY_EMOJI[a.category] ?? '📍'}</span>
                    <span className="font-semibold">{a.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{a.dayDate} · {a.time}</p>
                  <p className="text-xs text-gray-600 leading-snug">{a.description}</p>
                  {(a.estimatedCost ?? 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      ~${a.estimatedCost}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Empty state: no itinerary */}
      {noItinerary && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <span className="text-3xl block mb-3">🗺️</span>
          <h3 className="font-semibold text-gray-300 mb-1">No itinerary yet</h3>
          <p className="text-sm text-gray-500">
            Generate an itinerary first — each activity will appear as a pin on the map.
          </p>
        </div>
      )}

      {/* Warning: itinerary exists but no coords */}
      {!noItinerary && mapped.length === 0 && !geocoding && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-300 font-medium">No GPS coordinates in your itinerary</p>
          <p className="text-xs text-amber-400/70 mt-1">
            Regenerate your itinerary — the AI will include location coordinates for each activity.
          </p>
        </div>
      )}

      {/* Legend */}
      {mapped.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(CATEGORY_COLOR).map(([cat, color]) => {
            if (!mapped.some(a => a.category === cat)) return null;
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500 capitalize">{cat}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
