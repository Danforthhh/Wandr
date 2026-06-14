import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip, ItineraryDay } from '../types';
import { Loader2, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

const CATEGORY_EMOJI: Record<string, string> = {
  food:          '🍴',
  sightseeing:   '🏛️',
  activity:      '🎯',
  transport:     '🚌',
  accommodation: '🏨',
  free:          '⏸️',
};

function makeCityIcon(name: string, days: number) {
  const short = name.length > 12 ? name.slice(0, 11) + '…' : name;
  return L.divIcon({
    className: '',
    html: `<div style="background:#6366f1;padding:5px 10px 5px 8px;border-radius:20px;border:2.5px solid white;box-shadow:0 3px 12px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:5px;white-space:nowrap">
      <span style="font-size:13px">📍</span>
      <span style="color:white;font-size:12px;font-weight:700">${short}</span>
      <span style="background:rgba(255,255,255,0.22);border-radius:10px;padding:1px 6px;color:white;font-size:10px;font-weight:600">${days}j</span>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 16],
    popupAnchor: [80, -24],
  });
}

interface LocationGroup {
  name: string;
  lat: number;
  lng: number;
  days: (ItineraryDay & { globalIndex: number })[];
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
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], animate: true, duration: 0.7 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 11, { animate: true, duration: 0.7 });
    } else if (fallback) {
      map.setView(fallback, 10, { animate: true, duration: 0.7 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, fallback?.[0], fallback?.[1]]);
  return null;
}

interface Props {
  trip: Trip;
}

export default function TripMap({ trip }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [geocodedCenter, setGeocodedCenter] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const hasAnyCoords = trip.itinerary.some(d => d.activities.some(a => a.lat && a.lng));

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

  // Group days by location, compute centroid lat/lng per city
  const locationGroups = useMemo<LocationGroup[]>(() => {
    const map: Record<string, LocationGroup> = {};
    trip.itinerary.forEach((day, idx) => {
      const loc = day.location ?? trip.destination;
      if (!map[loc]) map[loc] = { name: loc, lat: 0, lng: 0, days: [] };
      map[loc].days.push({ ...day, globalIndex: idx + 1 });
    });
    return Object.values(map).map(group => {
      const acts = group.days.flatMap(d => d.activities.filter(a => a.lat && a.lng));
      if (acts.length > 0) {
        group.lat = acts.reduce((s, a) => s + a.lat!, 0) / acts.length;
        group.lng = acts.reduce((s, a) => s + a.lng!, 0) / acts.length;
      }
      return group;
    });
  }, [trip.itinerary, trip.destination]);

  const locationsWithCoords = locationGroups.filter(g => g.lat !== 0 || g.lng !== 0);
  const cityPositions: [number, number][] = locationsWithCoords.map(g => [g.lat, g.lng]);
  const posKey = cityPositions.map(p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');

  const noItinerary = trip.itinerary.length === 0;
  const selectedGroup = locationGroups.find(g => g.name === selectedLocation) ?? null;

  return (
    <div className="space-y-4">

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-800" style={{ height: '420px' }}>
        {geocoding && (
          <div className="absolute inset-0 bg-gray-900/80 z-[500] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-sm text-gray-400">Localisation de {trip.destination}…</span>
          </div>
        )}

        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController positions={cityPositions} fallback={geocodedCenter} posKey={posKey} />

          {/* Route between cities */}
          {cityPositions.length > 1 && (
            <Polyline
              positions={cityPositions}
              pathOptions={{ color: '#6366f1', weight: 2.5, opacity: 0.6, dashArray: '8 6' }}
            />
          )}

          {/* One marker per city */}
          {locationsWithCoords.map(group => (
            <Marker
              key={group.name}
              position={[group.lat, group.lng]}
              icon={makeCityIcon(group.name, group.days.length)}
              eventHandlers={{
                click: () => {
                  setSelectedLocation(prev => prev === group.name ? null : group.name);
                  setExpandedDayId(null);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Empty state */}
      {noItinerary && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <span className="text-3xl block mb-3">🗺️</span>
          <h3 className="font-semibold text-gray-300 mb-1">Aucun itinéraire</h3>
          <p className="text-sm text-gray-500">Générez un itinéraire — chaque étape apparaîtra sur la carte.</p>
        </div>
      )}

      {!noItinerary && locationsWithCoords.length === 0 && !geocoding && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-300 font-medium">Aucune coordonnée GPS dans cet itinéraire</p>
          <p className="text-xs text-amber-400/70 mt-1">Régénérez l'itinéraire pour obtenir les coordonnées de chaque activité.</p>
        </div>
      )}

      {/* Hint when no city selected */}
      {locationsWithCoords.length > 0 && !selectedGroup && (
        <p className="text-xs text-gray-600 text-center">
          Cliquez sur une ville pour voir ses jours de voyage.
        </p>
      )}

      {/* City detail panel */}
      {selectedGroup && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* City header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-gray-100">{selectedGroup.name}</span>
              <span className="text-xs text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                {selectedGroup.days.length} jour{selectedGroup.days.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Fermer
            </button>
          </div>

          {/* Days accordion */}
          <div className="divide-y divide-gray-800">
            {selectedGroup.days.map(day => {
              const isExpanded = expandedDayId === day.id;
              return (
                <div key={day.id}>
                  {/* Day row */}
                  <button
                    onClick={() => setExpandedDayId(prev => prev === day.id ? null : day.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition text-left"
                  >
                    <div>
                      <span className="text-xs font-bold text-indigo-400 mr-2">Jour {day.globalIndex}</span>
                      <span className="text-sm text-gray-200">{day.title}</span>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                    }
                  </button>

                  {/* Activities list */}
                  {isExpanded && (
                    <div className="bg-gray-950/60 px-5 pb-4 pt-1 space-y-2.5">
                      {day.activities.length === 0 && (
                        <p className="text-xs text-gray-600 py-2">Aucune activité pour ce jour.</p>
                      )}
                      {day.activities.map(act => (
                        <div key={act.id} className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            <span className="text-base">{CATEGORY_EMOJI[act.category] ?? '📍'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-mono text-gray-500 shrink-0">{act.time}</span>
                              <span className="text-sm font-medium text-gray-200 truncate">{act.title}</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-snug mt-0.5">{act.description}</p>
                          </div>
                          {(act.estimatedCost ?? 0) > 0 && (
                            <span className="text-xs text-gray-500 shrink-0">~{act.estimatedCost}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
