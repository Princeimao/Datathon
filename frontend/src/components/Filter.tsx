import { Filter, Loader2 } from "lucide-react";
import { Select } from "../components/customUi";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../services/api";

export interface MapFilters {
  state: string;
  district: string;
  policeStation: string;
  policeUnitId: string;
  crimeType: string;
  heatmapLayer: string;
  timeOfDay: string;
  year: string;
  dateFrom: string;
  dateTo: string;
  riskLevel: string;
  minCases: number;
  moConfidence: number;
  moPatterns: string[];
  showActiveAlerts: boolean;
  showPulseZones: boolean;
  showAnimatedRings: boolean;
  showAlertBadges: boolean;
}

export const DEFAULT_FILTERS: MapFilters = {
  state: "All States",
  district: "All Districts",
  policeStation: "All Stations",
  policeUnitId: "",
  crimeType: "All Crime Types",
  heatmapLayer: "All Layers",
  timeOfDay: "All Day",
  year: "All Years",
  dateFrom: "",
  dateTo: "",
  riskLevel: "All Risk Levels",
  minCases: 0,
  moConfidence: 0,
  moPatterns: [],
  showActiveAlerts: false,
  showPulseZones: false,
  showAnimatedRings: false,
  showAlertBadges: false,
};

const MO_PATTERN_OPTIONS: { key: string; label: string }[] = [
  { key: "HELMET_MASKED_RIDERS", label: "Helmet-Masked Riders" },
  { key: "NIGHT_OPERATIONS", label: "Night Operations" },
  { key: "STOLEN_VEHICLE_USAGE", label: "Stolen Vehicle Usage" },
  { key: "ATM_TARGET_SELECTION", label: "ATM Target Selection" },
  { key: "TWO_PERSON_TEAM", label: "Two-Person Team" },
  { key: "ESCAPE_ROUTE_SIMILARITY", label: "Escape Route Similarity" },
];

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
  const [districts, setDistricts] = useState<string[]>(["All Districts"]);
  const [policeStationList, setPoliceStationList] = useState<string[]>([
    "All Stations",
  ]);
  const [stationIds, setStationIds] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  /* Backend-driven states (with DB ids) */
  const [stateMap, setStateMap] = useState<Record<string, number>>({});

  const updateFilter = useCallback((key: keyof MapFilters, value: any) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };

      // Reset downstream filters when a parent changes
      if (key === "state") {
        next.district = "All Districts";
        next.policeStation = "All Stations";
        next.policeUnitId = "";
      }
      if (key === "district") {
        next.policeStation = "All Stations";
        next.policeUnitId = "";
      }

      return next;
    });
  }, []);

  const applyFilters = useCallback(
    (next: MapFilters) => {
      setFilters(next);
      onFilterChange?.(next);
    },
    [onFilterChange],
  );

  /* Fetch states from the backend */
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res: any = await api.states();
        const list: { id: number; stateName: string }[] = res ?? [];
        const map: Record<string, number> = {};

        list.forEach((item) => {
          map[item.stateName] = item.id;
        });

        setStateMap(map);
        setStates(["All States", ...list.map((item) => item.stateName)]);
      } catch (err) {
        console.error("Failed to fetch states:", err);
        setStates(["All States"]);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  /* Fetch all districts from the backend once and filter by selected state */
  useEffect(() => {
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const res: any = await api.districts();
        const list: {
          id: number;
          districtName: string;
          stateId: number;
        }[] = res ?? [];

        if (filters.state === "All States") {
          setDistricts(["All Districts"]);
          return;
        }

        const stateId = stateMap[filters.state];

        const matching = list
          .filter((district) => district.stateId === stateId)
          .map((district) => district.districtName);

        setDistricts(["All Districts", ...matching]);
      } catch (err) {
        console.error("Failed to fetch districts:", err);
        setDistricts(["All Districts"]);
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, [filters.state, stateMap]);

  /* Fetch police stations when state or district changes */
  useEffect(() => {
    if (filters.state === "All States" && filters.district === "All Districts") {
      setPoliceStationList(["All Stations"]);
      setStationIds({});
      return;
    }

    const fetchStations = async () => {
      setLoadingStations(true);
      try {
        const res: any = await api.policeStations({
          state: filters.state === "All States" ? undefined : filters.state,
          district:
            filters.district === "All Districts" ? undefined : filters.district,
        });

        const stations: { id: number; name: string }[] = res?.stations ?? [];
        const ids: Record<string, string> = {};

        stations.forEach((station) => {
          ids[station.name] = String(station.id);
        });

        setStationIds(ids);
        setPoliceStationList(["All Stations", ...stations.map((s) => s.name)]);
      } catch (err) {
        console.error("Failed to fetch police stations:", err);
        setPoliceStationList(["All Stations"]);
        setStationIds({});
      } finally {
        setLoadingStations(false);
      }
    };
    fetchStations();
  }, [filters.state, filters.district]);

  const handleStationChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        policeStation: value,
        policeUnitId: value === "All Stations" ? "" : stationIds[value] || "",
      }));
    },
    [stationIds],
  );

  const handleApply = () => {
    onFilterChange?.(filters);
  };

  const handleReset = () => {
    applyFilters({ ...DEFAULT_FILTERS });
  };

  /* Quick filters use the same central filter state + apply immediately */
  const handleQuickFilter = useCallback(
    (patch: Partial<MapFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        onFilterChange?.(next);
        return next;
      });
    },
    [onFilterChange],
  );

  const quickLastNDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    handleQuickFilter({
      dateFrom: start.toISOString().split("T")[0],
      dateTo: end.toISOString().split("T")[0],
      year: "All Years",
    });
  };

  const toggleMoPattern = useCallback((pattern: string) => {
    setFilters((prev) => {
      const has = prev.moPatterns.includes(pattern);

      return {
        ...prev,
        moPatterns: has
          ? prev.moPatterns.filter((p) => p !== pattern)
          : [...prev.moPatterns, pattern],
      };
    });
  }, []);

  /* District/station options memoized and always arrays */
  const districtOptions = useMemo(
    () => (Array.isArray(districts) ? districts : ["All Districts"]),
    [districts],
  );

  const stationOptions = useMemo(
    () => (Array.isArray(policeStationList) ? policeStationList : ["All Stations"]),
    [policeStationList],
  );

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
          label="District"
          value={filters.district}
          onChange={(e) => updateFilter("district", e.target.value)}
          loading={loadingDistricts}
          disabled={filters.state === "All States"}
        >
          {districtOptions.map((district, index) => (
            <option key={index} value={district}>
              {district}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Police Station"
          value={filters.policeStation}
          onChange={(e) => handleStationChange(e.target.value)}
          loading={loadingStations}
          disabled={filters.state === "All States"}
        >
          {stationOptions.map((station, index) => (
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
            <option>All Years</option>
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
            {MO_PATTERN_OPTIONS.map((option) => (
              <Checkbox
                key={option.key}
                label={option.label}
                checked={filters.moPatterns.includes(option.key)}
                onChange={() => toggleMoPattern(option.key)}
              />
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-green-900">
            Quick Filters
          </h3>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => quickLastNDays(7)}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              Last 7 Days
            </button>

            <button
              onClick={() => quickLastNDays(30)}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              Last 30 Days
            </button>

            <button
              onClick={() => handleQuickFilter({ riskLevel: "High" })}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              High Risk
            </button>

            <button
              onClick={() =>
                handleQuickFilter({ heatmapLayer: "Crime Density" })
              }
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
        {loading && (
          <Loader2 size={12} className="animate-spin text-green-500" />
        )}
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
