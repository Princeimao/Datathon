import { Filter, Loader2 } from "lucide-react";
import { Select } from "../components/customUi";
import { useEffect, useState, useCallback } from "react";

export interface MapFilters {
  state: string;
  city: string;
  policeStation: string;
  crimeType: string;
  heatmapLayer: string;
  timeOfDay: string;
  year: string;
  dateFrom: string;
  dateTo: string;
  riskLevel: string;
  minCases: number;
  moConfidence: number;
  showActiveAlerts: boolean;
  showPulseZones: boolean;
  showAnimatedRings: boolean;
  showAlertBadges: boolean;
}

const DEFAULT_FILTERS: MapFilters = {
  state: "All States",
  city: "All Cities",
  policeStation: "All Stations",
  crimeType: "All Crime Types",
  heatmapLayer: "All Layers",
  timeOfDay: "All Day",
  year: "2026",
  dateFrom: "",
  dateTo: "",
  riskLevel: "All Risk Levels",
  minCases: 0,
  moConfidence: 0,
  showActiveAlerts: false,
  showPulseZones: false,
  showAnimatedRings: false,
  showAlertBadges: false,
};

interface CrimeMapFiltersProps {
  onFilterChange?: (filters: MapFilters) => void;
  totalCases?: number;
  highRiskCount?: number;
  loading?: boolean;
}

export default function CrimeMapFilters({
  onFilterChange,
  totalCases = 0,
  highRiskCount = 0,
  loading = false,
}: CrimeMapFiltersProps) {
  const [filters, setFilters] = useState<MapFilters>({ ...DEFAULT_FILTERS });
  const [states, setStates] = useState<string[]>(["All States"]);
  const [cities, setCities] = useState<string[]>(["All Cities"]);
  const [policeStationList, setPoliceStationList] = useState<string[]>([
    "All Stations",
  ]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  const updateFilter = useCallback(
    (key: keyof MapFilters, value: any) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };

        // Reset downstream filters when parent changes
        if (key === "state") {
          next.city = "All Cities";
          next.policeStation = "All Stations";
        }
        if (key === "city") {
          next.policeStation = "All Stations";
        }

        return next;
      });
    },
    [],
  );

  /* Fetch Indian states */
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_MAP_API}/states/q?country=India`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );
        const data = await res.json();
        if (!data.error) {
          const stateNames =
            data?.data?.states?.map((s: any) => s.name) ?? [];
          setStates(["All States", ...stateNames]);
        }
      } catch (err) {
        console.error("Failed to fetch states:", err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  /* Fetch cities when state changes */
  useEffect(() => {
    if (filters.state === "All States") {
      setCities(["All Cities"]);
      return;
    }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_MAP_API}/state/cities`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country: "India",
              state: filters.state,
            }),
          },
        );
        const data = await res.json();
        if (!data.error) {
          const cityNames = data?.data ?? [];
          setCities(["All Cities", ...cityNames]);
        }
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [filters.state]);

  /* Fetch police stations when state or city changes */
  useEffect(() => {
    if (filters.state === "All States" && filters.city === "All Cities") {
      setPoliceStationList(["All Stations"]);
      return;
    }

    const fetchStations = async () => {
      setLoadingStations(true);
      try {
        let url = "";
        if (filters.city !== "All Cities") {
          url = `${import.meta.env.VITE_BACKEND_API}/police/city/${filters.city}`;
        } else if (filters.state !== "All States") {
          url = `${import.meta.env.VITE_BACKEND_API}/police/state/${filters.state}`;
        }
        if (!url) return;

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!data.error) {
          const stationNames = data?.stations ?? [];
          setPoliceStationList(["All Stations", ...stationNames]);
        }
      } catch (err) {
        console.error("Failed to fetch police stations:", err);
      } finally {
        setLoadingStations(false);
      }
    };
    fetchStations();
  }, [filters.state, filters.city]);

  const handleApply = () => {
    onFilterChange?.(filters);
  };

  const handleReset = () => {
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    onFilterChange?.(reset);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Filter className="h-5 w-5 text-green-700" />
        <h2 className="text-lg font-semibold text-green-900">
          Intelligence Filters
        </h2>
        {loading && (
          <Loader2 size={16} className="ml-auto animate-spin text-green-600" />
        )}
      </div>

      <div className="space-y-5">
        <FilterSelect
          label="State"
          value={filters.state}
          onChange={(e) => updateFilter("state", e.target.value)}
          loading={loadingStates}
        >
          {states.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Cities"
          value={filters.city}
          onChange={(e) => updateFilter("city", e.target.value)}
          loading={loadingCities}
        >
          {cities.map((city, index) => (
            <option key={index} value={city}>
              {city}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Police Station"
          value={filters.policeStation}
          onChange={(e) => updateFilter("policeStation", e.target.value)}
          loading={loadingStations}
        >
          {policeStationList.map((station, index) => (
            <option key={index} value={station}>
              {station}
            </option>
          ))}
        </FilterSelect>

        {/* Crime */}
        <FilterSelect
          label="Crime Type"
          value={filters.crimeType}
          onChange={(e) => updateFilter("crimeType", e.target.value)}
        >
          <option>All Crime Types</option>
          <option>Theft</option>
          <option>Cybercrime</option>
          <option>Assault</option>
          <option>Robbery</option>
          <option>Homicide</option>
          <option>Fraud</option>
          <option>Kidnapping</option>
        </FilterSelect>

        {/* Heatmap */}
        <FilterSelect
          label="Heatmap Layer"
          value={filters.heatmapLayer}
          onChange={(e) => updateFilter("heatmapLayer", e.target.value)}
        >
          <option>All Layers</option>
          <option>Crime Density</option>
          <option>Theft Hotspots</option>
          <option>Cybercrime Hotspots</option>
          <option>Assault Hotspots</option>
          <option>Robbery Hotspots</option>
          <option>Homicide Hotspots</option>
        </FilterSelect>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <FilterSelect
            label="Time"
            value={filters.timeOfDay}
            onChange={(e) => updateFilter("timeOfDay", e.target.value)}
          >
            <option>All Day</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
            <option>Night</option>
          </FilterSelect>

          <FilterSelect
            label="Year"
            value={filters.year}
            onChange={(e) => updateFilter("year", e.target.value)}
          >
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
            <option>2023</option>
          </FilterSelect>
        </div>

        {/* Date Range */}
        <div>
          <label className="mb-2 block text-sm font-medium text-green-800">
            Date Range
          </label>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="min-h-10 rounded-xl border border-green-200 px-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="min-h-10 rounded-xl border border-green-200 px-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* Risk */}
        <FilterSelect
          label="Risk Level"
          value={filters.riskLevel}
          onChange={(e) => updateFilter("riskLevel", e.target.value)}
        >
          <option>All Risk Levels</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </FilterSelect>

        {/* Crime Count */}
        <div>
          <label className="mb-2 block text-sm font-medium text-green-800">
            Minimum Cases ({filters.minCases})
          </label>

          <input
            type="range"
            min="0"
            max="5000"
            value={filters.minCases}
            onChange={(e) => updateFilter("minCases", Number(e.target.value))}
            className="w-full accent-green-600"
          />

          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>5000+</span>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <label className="mb-2 block text-sm font-medium text-green-800">
            MO Confidence Score ({filters.moConfidence}%)
          </label>

          <input
            type="range"
            min="0"
            max="100"
            value={filters.moConfidence}
            onChange={(e) =>
              updateFilter("moConfidence", Number(e.target.value))
            }
            className="w-full accent-green-600"
          />

          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Trend Alerts */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-green-900">
            Emerging Alerts
          </h3>

          <div className="space-y-2">
            <Checkbox
              label="Show Active Alerts"
              checked={filters.showActiveAlerts}
              onChange={(v) => updateFilter("showActiveAlerts", v)}
            />
            <Checkbox
              label="Pulse Zones"
              checked={filters.showPulseZones}
              onChange={(v) => updateFilter("showPulseZones", v)}
            />
            <Checkbox
              label="Animated Rings"
              checked={filters.showAnimatedRings}
              onChange={(v) => updateFilter("showAnimatedRings", v)}
            />
            <Checkbox
              label="Alert Badges"
              checked={filters.showAlertBadges}
              onChange={(v) => updateFilter("showAlertBadges", v)}
            />
          </div>
        </div>

        {/* MO */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-green-900">
            MO Intelligence
          </h3>

          <div className="space-y-2">
            <Checkbox label="Helmet-Masked Riders" />
            <Checkbox label="Night Operations" />
            <Checkbox label="Stolen Vehicle Usage" />
            <Checkbox label="ATM Target Selection" />
            <Checkbox label="Two-Person Team" />
            <Checkbox label="Escape Route Similarity" />
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-green-900">
            Quick Filters
          </h3>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                updateFilter("dateFrom", d.toISOString().split("T")[0]);
                updateFilter("dateTo", new Date().toISOString().split("T")[0]);
              }}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              Last 7 Days
            </button>

            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                updateFilter("dateFrom", d.toISOString().split("T")[0]);
                updateFilter("dateTo", new Date().toISOString().split("T")[0]);
              }}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              Last 30 Days
            </button>

            <button
              onClick={() => updateFilter("riskLevel", "High")}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              High Risk
            </button>

            <button
              onClick={() => updateFilter("heatmapLayer", "Crime Density")}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              Hotspots
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-2xl bg-green-50 p-4">
            <p className="text-sm text-green-700">Cases</p>
            <h3 className="mt-1 text-3xl font-bold text-green-900">
              {totalCases.toLocaleString()}
            </h3>
          </div>

          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-sm text-red-500">High Risk</p>
            <h3 className="mt-1 text-3xl font-bold text-red-600">
              {highRiskCount}
            </h3>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleReset}
            className="flex-1 rounded-xl border border-green-200 py-2 font-medium text-green-700"
          >
            Reset
          </button>

          <button
            onClick={handleApply}
            className="flex-1 rounded-xl bg-green-600 py-2 font-medium text-white hover:bg-green-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  children,
  loading,
  ...props
}: {
  label: string;
  children: React.ReactNode;
  loading?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-green-800">
        {label}
        {loading && <Loader2 size={12} className="animate-spin text-green-500" />}
      </label>

      <Select className="w-full" {...props}>
        {children}
      </Select>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-green-300 text-green-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
