import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import CrimeMapFilters, {
  type MapFilters,
  DEFAULT_FILTERS,
} from "../components/Filter";
import { Card } from "../components/customUi";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import L from "leaflet";
import { api } from "../services/api";
import { Loader2, AlertTriangle } from "lucide-react";

/* ─── types ─── */
interface CrimePoint {
  caseId: string;
  caseNumber: string;
  title: string;
  crimeType: string;
  incidentDate: string;
  status: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  stationName: string;
  address: string;
  riskScore?: number;
}

interface MapDataResponse {
  totalPoints: number;
  points: CrimePoint[];
  stateStats: {
    state: string;
    totalCases: number;
    crimeTypes: Record<string, number>;
    districts: Record<string, number>;
    riskScore: number;
    riskLevel: string;
  }[];
  summary: {
    totalCases: number;
    highRiskCount: number;
    statesWithData: number;
  };
}

/* ─── constants ─── */
const INDIA_CENTER: LatLngTuple = [22.5, 79.0];
const INDIA_ZOOM = 5;

const CRIME_MARKER_COLORS: Record<string, string> = {
  CYBERCRIME: "#7c3aed",
  THEFT: "#2563eb",
  ASSAULT: "#f59e0b",
  ROBBERY: "#ef4444",
  HOMICIDE: "#991b1b",
  MURDER: "#7f1d1d",
  FRAUD: "#0891b2",
  BURGLARY: "#d97706",
  KIDNAPPING: "#9333ea",
  DRUG_OFFENSE: "#059669",
  RAPE: "#dc2626",
  OTHER: "#64748b",
};

const LAYER_CRIME_MAP: Record<string, string> = {
  "Theft Hotspots": "theft",
  "Cybercrime Hotspots": "cybercrime",
  "Assault Hotspots": "assault",
  "Robbery Hotspots": "robbery",
  "Homicide Hotspots": "homicide",
};

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case "high":
      return { color: "#dc2626", fillColor: "#fca5a5", fillOpacity: 0.4 };
    case "medium":
      return { color: "#f59e0b", fillColor: "#fde68a", fillOpacity: 0.3 };
    case "low":
      return { color: "#16a34a", fillColor: "#86efac", fillOpacity: 0.2 };
    default:
      return { color: "#6b7280", fillColor: "#d1d5db", fillOpacity: 0.15 };
  }
}

/* ─── heatmap grid helpers ─── */
interface HeatCell {
  id: string;
  lat: number;
  lng: number;
  count: number;
}

function buildHeatGrid(points: CrimePoint[], layer: string): HeatCell[] {
  const list = Array.isArray(points) ? points : [];
  const layerType = LAYER_CRIME_MAP[layer];

  const filtered = layerType
    ? list.filter(
        (point) =>
          (point.crimeType || "").toLowerCase() === layerType,
      )
    : list;

  const cell = 0.25;
  const grid = new Map<string, HeatCell>();

  filtered.forEach((point) => {
    if (!point.latitude || !point.longitude) return;

    const lat = Math.round(point.latitude / cell) * cell;
    const lng = Math.round(point.longitude / cell) * cell;
    const key = `${lat}:${lng}`;

    const existing = grid.get(key);

    if (existing) {
      existing.count++;
    } else {
      grid.set(key, { id: key, lat, lng, count: 1 });
    }
  });

  return [...grid.values()].sort((a, b) => b.count - a.count);
}

function heatColor(count: number, max: number) {
  const ratio = max > 0 ? count / max : 0;

  if (ratio > 0.75) return "#dc2626";
  if (ratio > 0.5) return "#f97316";
  if (ratio > 0.25) return "#f59e0b";
  return "#16a34a";
}

/* ─── map controller component ─── */
function MapController({
  bounds,
  center,
  zoom,
}: {
  bounds?: LatLngBoundsExpression;
  center?: LatLngTuple;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } else if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [bounds, center, zoom, map]);

  return null;
}

/* ─── main component ─── */
const CrimeMap = () => {
  const [boundary, setBoundary] = useState<any>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>({ ...DEFAULT_FILTERS });
  const geoJsonRef = useRef<any>(null);

  const [stateIdMap, setStateIdMap] = useState<Record<string, number>>({});
  const [districtIdMap, setDistrictIdMap] = useState<Record<string, number>>(
    {},
  );

  /* Load state/district id maps (for boundary lookups) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [statesRes, districtsRes]: any = await Promise.all([
          api.states(),
          api.districts(),
        ]);

        const stateMap: Record<string, number> = {};
        const districtMap: Record<string, number> = {};

        (statesRes ?? []).forEach((s: any) => {
          stateMap[s.stateName] = Number(s.id);
        });

        (districtsRes ?? []).forEach((d: any) => {
          districtMap[d.districtName] = Number(d.id);
        });

        if (!cancelled) {
          setStateIdMap(stateMap);
          setDistrictIdMap(districtMap);
        }
      } catch (err) {
        console.error("Failed to load boundary id maps:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Fetch map data from backend */
  const fetchMapData = useCallback(async (next?: MapFilters) => {
    setMapLoading(true);
    setError(null);
    try {
      const res: any = await api.mapData(next || undefined);

      setMapData(res?.data ?? null);
    } catch (err: any) {
      console.error("Map data fetch failed:", err);
      setError(err.message || "Failed to load crime data");
    } finally {
      setMapLoading(false);
    }
  }, []);

  /* Fetch the correct boundary (state or district) for the current filter */
  const fetchBoundary = useCallback(
    async (next: MapFilters) => {
      setBoundaryLoading(true);
      try {
        if (next.state === "All States") {
          setBoundary(null);
          return;
        }

        if (next.district && next.district !== "All Districts") {
          const districtId = districtIdMap[next.district];

          if (districtId) {
            const res: any = await api.districtBoundary(districtId);
            setBoundary(res ?? null);
            return;
          }
        }

        const stateId = stateIdMap[next.state];

        if (stateId) {
          const res: any = await api.stateBoundary(stateId);
          setBoundary(res ?? null);
        } else {
          setBoundary(null);
        }
      } catch (err) {
        console.error("Boundary fetch failed:", err);
        setBoundary(null);
      } finally {
        setBoundaryLoading(false);
      }
    },
    [stateIdMap, districtIdMap],
  );

  /* Initial load */
  useEffect(() => {
    fetchMapData(DEFAULT_FILTERS);
  }, [fetchMapData]);

  /* Handle filter changes (normal + quick filters share this path) */
  const handleFilterChange = useCallback(
    (next: MapFilters) => {
      setFilters(next);
      fetchMapData(next);
      fetchBoundary(next);
    },
    [fetchMapData, fetchBoundary],
  );

  /* Map bounds follow the selected boundary */
  const mapBounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    if (!boundary) return undefined;

    try {
      const layer = L.geoJSON(boundary);
      const bounds = layer.getBounds();
      if (bounds.isValid()) return bounds;
    } catch {
      // fall through
    }
    return undefined;
  }, [boundary]);

  const points = useMemo(
    () => (Array.isArray(mapData?.points) ? mapData.points : []),
    [mapData],
  );

  const heatCells = useMemo(
    () => buildHeatGrid(points, filters.heatmapLayer),
    [points, filters.heatmapLayer],
  );

  const maxHeat = useMemo(
    () => heatCells.reduce((max, cell) => Math.max(max, cell.count), 0),
    [heatCells],
  );

  /* Top hotspot cells for pulse zones / rings / badges */
  const hotspotCells = useMemo(
    () => heatCells.slice(0, 12),
    [heatCells],
  );

  /* Style for the selected boundary */
  const boundaryStyle = useCallback(
    (feature: any) => ({
      color: "#15803d",
      weight: 2.5,
      fillColor: "#22c55e",
      fillOpacity: 0.12,
      dashArray: "4",
    }),
    [],
  );

  const onEachBoundaryFeature = useCallback((_feature: any, layer: any) => {
    layer.bindTooltip("Selected boundary", { sticky: true });
  }, []);

  const pulseIcon = L.divIcon({
    className: "pulse-ring-marker",
    html: '<div class="pulse-ring is-alert"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  const ringIcon = L.divIcon({
    className: "pulse-ring-marker",
    html: '<div class="pulse-ring is-ring"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  const showHeatmap = filters.heatmapLayer !== "All Layers";

  return (
    <div className="flex gap-5 w-full">
      <Card className="h-[93vh] p-5 overflow-hidden col-span-2 w-[50vw]">
        <div className="mb-4">
          <h2 className="font-semibold text-lg text-text_primary">
            India Crime Risk Map
          </h2>
          <p className="text-sm text-green-600">
            {filters.state !== "All States"
              ? `Showing ${filters.state}${
                  filters.district !== "All Districts"
                    ? ` › ${filters.district}`
                    : ""
                }${
                  filters.policeStation !== "All Stations"
                    ? ` › ${filters.policeStation}`
                    : ""
                }`
              : "Select a state to drill down to district boundaries."}
          </p>
        </div>

        {/* MAP */}
        <div className="w-full h-[90%] relative">
          {(mapLoading || boundaryLoading) && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin text-green-600" />
                <span className="text-sm text-green-700">
                  {mapLoading ? "Fetching crime data…" : "Loading boundary…"}
                </span>
              </div>
            </div>
          )}

          {error && !mapData && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 rounded-xl">
              <div className="flex flex-col items-center gap-2 text-center">
                <AlertTriangle size={28} className="text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => handleFilterChange(filters)}
                  className="mt-2 rounded-lg bg-green-600 px-4 py-1.5 text-xs text-white"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <MapContainer
            center={INDIA_CENTER}
            zoom={INDIA_ZOOM}
            scrollWheelZoom={true}
            className="w-full h-full rounded-xl"
            style={{ background: "#f0fdf4" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />

            {/* Map controller for zoom/pan */}
            <MapController
              bounds={mapBounds}
              center={!mapBounds ? INDIA_CENTER : undefined}
              zoom={!mapBounds ? INDIA_ZOOM : undefined}
            />

            {/* Selected state/district boundary (from the backend boundaries
                controller). Stays visible even when the filtered dataset is
                empty. */}
            {boundary && (
              <GeoJSON
                key={JSON.stringify(filters.state) + JSON.stringify(filters.district)}
                ref={geoJsonRef}
                data={boundary}
                style={boundaryStyle}
                onEachFeature={onEachBoundaryFeature}
              />
            )}

            {/* Heatmap density grid */}
            {showHeatmap &&
              heatCells.map((cell) => (
                <CircleMarker
                  key={cell.id}
                  center={[cell.lat, cell.lng]}
                  radius={Math.min(26, 6 + cell.count * 1.4)}
                  pathOptions={{
                    color: heatColor(cell.count, maxHeat),
                    fillColor: heatColor(cell.count, maxHeat),
                    fillOpacity: 0.45,
                    weight: 1,
                    opacity: 0.7,
                  }}
                />
              ))}

            {/* Pulse zones / animated rings / alert badges on hotspots */}
            {filters.showPulseZones &&
              hotspotCells.map((cell) => (
                <Marker
                  key={`pulse-${cell.id}`}
                  position={[cell.lat, cell.lng]}
                  icon={pulseIcon}
                  interactive={false}
                />
              ))}

            {filters.showAnimatedRings &&
              hotspotCells.map((cell, index) => (
                <Marker
                  key={`ring-${cell.id}`}
                  position={[cell.lat, cell.lng]}
                  icon={ringIcon}
                  interactive={false}
                />
              ))}

            {filters.showAlertBadges &&
              hotspotCells.map((cell) => (
                <Marker
                  key={`badge-${cell.id}`}
                  position={[cell.lat, cell.lng]}
                  icon={L.divIcon({
                    className: "alert-badge",
                    html: String(cell.count),
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                  interactive={false}
                />
              ))}

            {/* Crime markers */}
            {points.map((point) => (
              <CircleMarker
                key={`${point.caseId}-${point.latitude}-${point.longitude}`}
                center={[point.latitude, point.longitude]}
                radius={6}
                pathOptions={{
                  color:
                    CRIME_MARKER_COLORS[point.crimeType] ||
                    CRIME_MARKER_COLORS.OTHER,
                  fillColor:
                    CRIME_MARKER_COLORS[point.crimeType] ||
                    CRIME_MARKER_COLORS.OTHER,
                  fillOpacity: 0.7,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong style={{ fontSize: 13, color: "#14532d" }}>
                      {point.title}
                    </strong>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {point.caseNumber}
                    </div>
                    <hr style={{ margin: "6px 0", borderColor: "#e5e7eb" }} />
                    <div style={{ fontSize: 12 }}>
                      <div>
                        🏷️ <strong>{point.crimeType}</strong>
                      </div>
                      <div>📍 {point.address || point.district}</div>
                      <div>
                        🏢 {point.stationName} ({point.state})
                      </div>
                      <div>
                        📅{" "}
                        {new Date(point.incidentDate).toLocaleDateString()}
                      </div>
                      <div>
                        Status:{" "}
                        <span
                          style={{
                            color:
                              point.status === "OPEN"
                                ? "#dc2626"
                                : point.status === "CLOSED"
                                  ? "#16a34a"
                                  : "#f59e0b",
                            fontWeight: 600,
                          }}
                        >
                          {point.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-white/90 backdrop-blur-sm p-3 shadow-lg border border-green-100">
            <p className="text-xs font-semibold text-green-900 mb-2">
              Risk Level
            </p>
            <div className="flex flex-col gap-1">
              {[
                { label: "High", color: "#dc2626" },
                { label: "Medium", color: "#f59e0b" },
                { label: "Low", color: "#16a34a" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-xs text-gray-700">{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="w-[28vw] h-[93vh] overflow-y-auto p-5 flex flex-col">
        <CrimeMapFilters
          onFilterChange={handleFilterChange}
          totalCases={mapData?.summary?.totalCases ?? 0}
          highRiskCount={mapData?.summary?.highRiskCount ?? 0}
          loading={mapLoading}
        />
      </Card>
    </div>
  );
};

export default CrimeMap;
