"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix webpack bundling issue with Leaflet default marker icons
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export interface MapPickerProps {
  onPin: (lat: number, lng: number, result?: NominatimResult) => void;
}

function ClickHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (coords && coords !== prevRef.current) {
      map.flyTo(coords, 14, { duration: 1.2 });
      prevRef.current = coords;
    }
  }, [coords, map]);
  return null;
}

export default function MapPicker({ onPin }: MapPickerProps) {
  const [iconFixed, setIconFixed] = useState(false);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);

  useEffect(() => {
    fixLeafletIcons();
    setIconFixed(true);
  }, []);

  function handleMapClick(lat: number, lng: number) {
    setPin([lat, lng]);
    onPin(lat, lng);
    setSuggestions([]);
  }

  async function doSearch() {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en-US,en" } }
      );
      if (!res.ok) throw new Error("Search failed");
      const data: NominatimResult[] = await res.json();
      if (data.length === 0) {
        setSearchError("No results found");
      } else if (data.length === 1) {
        selectSuggestion(data[0]);
      } else {
        setSuggestions(data);
      }
    } catch {
      setSearchError("Location search unavailable");
    } finally {
      setSearching(false);
    }
  }

  function selectSuggestion(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPin([lat, lng]);
    setFlyTarget([lat, lng]);
    onPin(lat, lng, result);
    setSuggestions([]);
    setSearch(result.display_name.split(",")[0]);
  }

  if (!iconFixed) return null;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Search address or city (e.g. Decatur, IL)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSuggestions([]); }}
            onKeyDown={e => e.key === "Enter" && doSearch()}
          />
          <button
            onClick={doSearch}
            disabled={searching || !search.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-white text-sm font-medium transition-colors"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  onClick={() => selectSuggestion(s)}
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchError && (
          <p className="text-xs text-red-400 mt-1">{searchError}</p>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-600" style={{ height: 280 }}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          style={{ height: "100%", width: "100%", background: "#1e293b" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPin={handleMapClick} />
          <FlyTo coords={flyTarget} />
          {pin && <Marker position={pin} />}
        </MapContainer>
      </div>

      {/* Coordinates display */}
      {pin ? (
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <span className="text-green-400 text-lg">📍</span>
          <div>
            <p className="text-sm font-semibold text-green-300">Pin dropped</p>
            <p className="text-xs text-slate-400 font-mono">
              {Math.abs(pin[0]).toFixed(6)}° {pin[0] >= 0 ? "N" : "S"},&nbsp;
              {Math.abs(pin[1]).toFixed(6)}° {pin[1] >= 0 ? "E" : "W"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          Search for a location or click the map to drop a pin
        </p>
      )}
    </div>
  );
}
