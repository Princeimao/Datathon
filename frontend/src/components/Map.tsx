import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { DistrictRisk } from "../analyticsData";

const indiaCenter: [number, number] = [22.5937, 78.9629];

import { useMapEvents } from "react-leaflet";

function ZoomTracker({ setZoom }: { setZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
  });

  return null;
}

export default function Map({
  visible,
  selected,
  setSelectedId,
}: {
  visible: any[];
  selected: any;
  setSelectedId: (id: string | number) => void;
}) {
  const [geoData, setGeoData] = useState<any>(null);
  const [zoom, setZoom] = useState(5);

  function FlyToSelection({ district }: { district: DistrictRisk }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo([district.lat, district.lng], district.risk === "high" ? 7 : 6, { duration: 0.55 });
    }, [district, map]);
    return null;
  }

  useEffect(() => {
    fetch("/geo/geoJson.geojson")
      .then(res => res.json())
      .then(data => {
        console.log("GEO LOADED:", data);
        setGeoData(data);
      });
  }, []);

  const districtLookup = useMemo(() => {
    const map: Record<string, any> = {};

    visible.forEach((district) => {
      map[district.name.toLowerCase()] = district;
    });

    return map;
  }, [visible]);

  const getRiskStyle = (risk: string) => {
    switch (risk) {
      case "critical":
        return {
          fill: "#dc2626",
          stroke: "#991b1b",
        };

      case "high":
        return {
          fill: "#f97316",
          stroke: "#c2410c",
        };

      case "medium":
        return {
          fill: "#facc15",
          stroke: "#ca8a04",
        };

      default:
        return {
          fill: "#22c55e",
          stroke: "#15803d",
        };
    }
  };

  const geoJsonStyle = (feature: any) => {
    const districtName =
      feature.properties.NAME_2?.toLowerCase() || "";

    const district = districtLookup[districtName];

    if (!district) {
      return {
        fillColor: "#e5e7eb",
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.25,
      };
    }

    const style = getRiskStyle(district.risk);

    const isSelected = selected?.id === district.id;

    return {
      fillColor: style.fill,
      color: isSelected ? "#111827" : style.stroke,
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.85 : 0.65,
    };
  };

  const onEachDistrict = (feature: any, layer: L.Layer) => {
    const districtName =
      feature.properties.NAME_2?.toLowerCase() || "";

    const district = districtLookup[districtName];

    if (!district) return;

    layer.on({
      click: () => {
        setSelectedId(district.id);
      },
    });

    layer.bindPopup(`
      <div style="min-width:220px">
        <strong>${district.name}</strong>
        <br />
        ${district.state}
        <br />
        <br />
        Cases: ${district.cases}
        <br />
        Risk: ${district.risk}
        <br />
        Top Crime: ${district.dominantCrime}
        <br />
        Forecast: ${district.forecast}
        <br />
        <br />
        ${district.anomaly}
      </div>
    `);
  };

  return (
    <MapContainer
      center={indiaCenter}
      zoom={5}
      minZoom={4}
      style={{ height: "650px", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* ✅ ADD THIS */}
      <ZoomTracker setZoom={setZoom} />

      <FlyToSelection district={selected} />

      {geoData && (
        <GeoJSON
          data={geoData}
          style={geoJsonStyle}
          onEachFeature={onEachDistrict}
        />
      )}
    </MapContainer> 

  );
}

