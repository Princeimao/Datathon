import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import CrimeMapFilters, { type MapFilters } from "../components/Filter";
import { Card } from "../components/customUi";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
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
    highRiskStates: number;
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
  const [geoData, setGeoData] = useState<any>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<MapFilters | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const geoJsonRef = useRef<any>(null);

  /* Load the GeoJSON file (43MB, loaded once and cached) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/geo/geoJson.geojson");
        const data = await response.json();
        if (!cancelled) setGeoData(data);
      } catch (err) {
        console.error("GeoJSON load failed:", err);
        if (!cancelled) setError("Failed to load map boundaries");
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Initial map data load */
  useEffect(() => {
    fetchMapData();
  }, []);

  /* Fetch map data from backend */
  const fetchMapData = useCallback(
    async (filters?: MapFilters) => {
      setMapLoading(true);
      setError(null);
      try {
        const params: any = {};
        if (filters) {
          if (filters.state !== "All States") params.state = filters.state;
          if (filters.city !== "All Cities") params.district = filters.city;
          if (filters.crimeType !== "All Crime Types")
            params.crimeType = filters.crimeType;
          if (filters.dateFrom) params.dateFrom = filters.dateFrom;
          if (filters.dateTo) params.dateTo = filters.dateTo;
          if (filters.riskLevel !== "All Risk Levels")
            params.riskLevel = filters.riskLevel;
        }
        const res = await api.mapData(params);
        setMapData(res.data);
      } catch (err: any) {
        console.error("Map data fetch failed:", err);
        setError(err.message || "Failed to load crime data");
      } finally {
        setMapLoading(false);
      }
    },
    [],
  );

  /* Handle filter changes */
  const handleFilterChange = useCallback(
    (filters: MapFilters) => {
      setActiveFilters(filters);
      fetchMapData(filters);
    },
    [fetchMapData],
  );

  /* Compute the filtered GeoJSON features to render as overlays */
  const filteredGeoFeatures: GeoJSON.FeatureCollection = useMemo(() => {
    if (!geoData?.features) return null;

    const state = activeFilters?.state;
    const city = activeFilters?.city;

    if (!state || state === "All States") {
      // Show all states with a light overlay if we have crime data
      if (mapData?.stateStats && mapData.stateStats.length > 0) {
        const statesWithData = new Set(
          mapData.stateStats.map((s) => s.state.toLowerCase()),
        );
        return {
          type: "FeatureCollection",
          features: geoData.features.filter((f: GeoJSON.Feature) => {
            const name1 = (f.properties?.NAME_1 || "").toLowerCase();
            return statesWithData.has(name1);
          }),
        };
      }
      return null;
    }

    // Filter by state name
    const stateNorm = state.toLowerCase();
    const stateFeatures = geoData.features.filter((f: any) => {
      const name1 = (f.properties?.NAME_1 || "").toLowerCase();
      return name1 === stateNorm;
    });

    if (city && city !== "All Cities") {
      // Drill down to district level
      const cityNorm = city.toLowerCase();
      const districtFeatures = stateFeatures.filter((f: any) => {
        const name2 = (f.properties?.NAME_2 || "").toLowerCase();
        return name2 === cityNorm || name2.includes(cityNorm) || cityNorm.includes(name2);
      });

      if (districtFeatures.length > 0) {
        return { type: "FeatureCollection", features: districtFeatures };
      }
    }

    // Return all districts of the selected state
    return {
      type: "FeatureCollection",
      features: stateFeatures,
    };
  }, [geoData, activeFilters, mapData]);

  /* Compute map bounds based on filtered features */
  const mapBounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    if (!filteredGeoFeatures?.features?.length) return undefined;

    try {
      const layer = L.geoJSON(filteredGeoFeatures);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        return bounds;
      }
    } catch {
      // fall through
    }
    return undefined;
  }, [filteredGeoFeatures]);

  /* Style for GeoJSON overlays – color by risk level from map data */
  const geoStyle = useCallback(
    (feature: any) => {
      const stateName = feature?.properties?.NAME_1 || "";
      const districtName = feature?.properties?.NAME_2 || "";
      const isSelected = activeFilters?.state && activeFilters.state !== "All States";

      // Find risk from stateStats
      const stateStat = mapData?.stateStats?.find(
        (s) => s.state.toLowerCase() === stateName.toLowerCase(),
      );

      if (stateStat) {
        const riskColors = getRiskColor(stateStat.riskLevel);
        return {
          ...riskColors,
          weight: isSelected ? 2.5 : 1.5,
          dashArray: isSelected ? "" : "3",
        };
      }

      return {
        color: "#16a34a",
        fillColor: "#bbf7d0",
        fillOpacity: 0.1,
        weight: 1,
        dashArray: "3",
      };
    },
    [mapData, activeFilters],
  );

  /* GeoJSON feature interaction */
  const onEachFeature = useCallback(
    (feature: any, layer: any) => {
      const stateName = feature.properties?.NAME_1 || "Unknown";
      const districtName = feature.properties?.NAME_2 || "";
      const stateStat = mapData?.stateStats?.find(
        (s) => s.state.toLowerCase() === stateName.toLowerCase(),
      );

      const popupContent = `
        <div style="min-width:180px">
          <strong style="font-size:14px;color:#14532d">${districtName || stateName}</strong>
          ${districtName ? `<br/><span style="font-size:11px;color:#6b7280">${stateName}</span>` : ""}
          ${
            stateStat
              ? `
            <hr style="margin:6px 0;border-color:#e5e7eb"/>
            <div style="font-size:12px;color:#374151">
              <div>📊 Cases: <strong>${stateStat.totalCases}</strong></div>
              <div>⚠️ Risk: <strong style="color:${stateStat.riskLevel === "high" ? "#dc2626" : stateStat.riskLevel === "medium" ? "#f59e0b" : "#16a34a"}">${stateStat.riskLevel.toUpperCase()}</strong></div>
              ${Object.entries(stateStat.crimeTypes)
                .slice(0, 3)
                .map(
                  ([type, count]) =>
                    `<div style="font-size:11px;margin-top:2px">${type}: ${count}</div>`,
                )
                .join("")}
            </div>
          `
              : '<div style="font-size:12px;color:#9ca3af;margin-top:4px">No crime data</div>'
          }
        </div>
      `;

      layer.bindPopup(popupContent);

      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            weight: 3,
            fillOpacity: 0.5,
          });
        },
        mouseout: (e: any) => {
          if (geoJsonRef.current) {
            geoJsonRef.current.resetStyle(e.target);
          }
        },
      });
    },
    [mapData],
  );

  return (
    <div className="flex gap-5 w-full">
      <Card className="h-[93vh] p-5 overflow-hidden col-span-2 w-[50vw]">
        <div className="mb-4">
          <h2 className="font-semibold text-lg text-text_primary">
            India Crime Risk Map
          </h2>
          <p className="text-sm text-green-600">
            {activeFilters?.state && activeFilters.state !== "All States"
              ? `Showing ${activeFilters.state}${activeFilters.city && activeFilters.city !== "All Cities" ? ` › ${activeFilters.city}` : ""}`
              : "Hover over states to see crime risk. Select a state to drill down."}
          </p>
        </div>

        {/* MAP */}
        <div className="w-full h-[90%] relative">
          {(geoLoading || mapLoading) && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin text-green-600" />
                <span className="text-sm text-green-700">
                  {geoLoading ? "Loading map boundaries…" : "Fetching crime data…"}
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
                  onClick={() => fetchMapData(activeFilters || undefined)}
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

            {/* GeoJSON overlay for state/district boundaries */}
            {filteredGeoFeatures && (
              <GeoJSON
                key={JSON.stringify(activeFilters) + (mapData?.totalPoints || 0)}
                ref={geoJsonRef}
                data={filteredGeoFeatures}
                style={geoStyle}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Crime markers */}
            {mapData?.points.map((point) => (
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
          totalCases={mapData?.summary.totalCases ?? 0}
          highRiskCount={mapData?.summary.highRiskStates ?? 0}
          loading={mapLoading}
        />
      </Card>
    </div>
  );
};

export default CrimeMap;
