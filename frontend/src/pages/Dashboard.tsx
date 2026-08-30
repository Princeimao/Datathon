import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  GitBranch,
  Loader2,
  MapPinned,
  MessageSquareText,
  Radar,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Radar as RadarShape,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sentimentSeries, type TimeGrain } from "../analyticsData";
import { Card, Badge, Select } from "../components/customUi";
import { cn } from "../lib/utils";
import { api } from "../services/api";

/* ─── color palette for crime-type pie chart ─── */
const CRIME_COLORS: Record<string, string> = {
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

function pickColor(name: string) {
  return CRIME_COLORS[name] || CRIME_COLORS.OTHER;
}

/* ─── dashboard data shape ─── */
interface DashboardData {
  totalCases: number;
  anomalyCount: number;
  highRiskCount: number;
  moCount: number;
  crimeMix: { name: string; value: number }[];
  districtStats: {
    district: string;
    state: string;
    cases: number;
    crimeTypes: Record<string, number>;
  }[];
  moNetwork: {
    mo: string;
    suspects: number;
    incidents: number;
    confidence: number;
  }[];
  predictiveRisks: {
    id: string;
    name: string;
    state: string;
    cases: number;
    risk: string;
    forecast: number;
    urbanization: number;
    unemployment: number;
    anomaly: string;
  }[];
  timeline: {
    label: string;
    cases: number;
    forecast: number;
    sentiment: number;
  }[];
  socioeconomicPoints: {
    name: string;
    urbanization: number;
    unemployment: number;
    cases: number;
    forecast: number;
  }[];
}

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [grain, setGrain] = useState<TimeGrain>("year");
  const [state, setState] = useState("all");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<{ id: string; stateName: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboardSummary({
        state,
        crimeType: category,
        groupBy: grain,
      });

      const payload = res?.data ?? {};
      const normalized = {
        ...payload,
        crimeMix: Array.isArray(payload.crimeMix) ? payload.crimeMix : [],
        districtStats: Array.isArray(payload.districtStats)
          ? payload.districtStats
          : [],
        moNetwork: Array.isArray(payload.moNetwork) ? payload.moNetwork : [],
        predictiveRisks: Array.isArray(payload.predictiveRisks)
          ? payload.predictiveRisks
          : [],
        timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
        socioeconomicPoints: Array.isArray(payload.socioeconomicPoints)
          ? payload.socioeconomicPoints
          : [],
        totalCases: payload.totalCases ?? 0,
        anomalyCount: payload.anomalyCount ?? 0,
        highRiskCount: payload.highRiskCount ?? 0,
        moCount: payload.moCount ?? 0,
      };

      setData(normalized);
    } catch (err: any) {
      console.error("Dashboard fetch failed:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [state, category, grain]);

  const loadStates = async () => {
    try {
      const res: any = await api.states();
      setStates(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("States fetch failed:", err);
      setError(err.message || "Failed to load states");
    }
  };

  useEffect(() => {
    fetchData();
    loadStates();
  }, [fetchData]);

  const districtBars = useMemo(() => {
    if (!data) return [];
    return data.districtStats.slice(0, 8).map((d) => ({
      name: d.district.length > 16 ? d.district.slice(0, 14) + "…" : d.district,
      cases: d.cases,
      forecast:
        data.predictiveRisks.find((p) => p.name === d.district)?.forecast ?? 0,
    }));
  }, [data]);

  const CRIME_COLORS = [
    "#2563EB", // blue
    "#7C3AED", // violet
    "#DB2777", // pink
    "#DC2626", // red
    "#EA580C", // orange
    "#D97706", // amber
    "#CA8A04", // yellow
    "#16A34A", // green
    "#059669", // emerald
    "#0891B2", // cyan
    "#0284C7", // sky
    "#4F46E5", // indigo
    "#9333EA", // purple
    "#C026D3", // fuchsia
    "#E11D48", // rose
    "#0F766E", // teal
    "#65A30D", // lime
    "#475569", // slate
    "#64748B",
    "#334155",
  ];

  const crimeMixColored = useMemo(() => {
    if (!data) return [];
    return data.crimeMix.map((item, index) => ({
      ...item,
      color: CRIME_COLORS[index % CRIME_COLORS.length],
    }));
  }, [data]);

  /* ─── loading state ─── */
  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-green-600">
          <Loader2 size={36} className="animate-spin" />
          <p className="text-sm font-medium">Loading intelligence dashboard…</p>
        </div>
      </div>
    );
  }

  /* ─── error state ─── */
  if (error && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700">
            Connection Error
          </h3>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ─── filters ─── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-green-950">
              India Crime Intelligence Dashboard
            </h3>
            <p className="text-sm text-green-600">
              Filter the whole analysis by state, time window, and crime
              typology.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="w-44"
            >
              <option value="all">All India</option>
              {states.map((item) => (
                <option key={item.id} value={item.stateName}>
                  {item.stateName}
                </option>
              ))}
            </Select>

            <Select
              value={grain}
              onChange={(event) => setGrain(event.target.value as TimeGrain)}
              className="w-36"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </Select>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-40"
            >
              <option value="all">All Types</option>
              <option value="cybercrime">Cybercrime</option>
              <option value="theft">Theft</option>
              <option value="assault">Assault</option>
              <option value="robbery">Robbery</option>
              <option value="homicide">Homicide</option>
              <option value="fraud">Fraud</option>
            </Select>

            {loading && (
              <div className="flex items-center gap-1.5 text-green-600">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Updating…</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ─── metric cards ─── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Radar}
          label="Total Cases"
          value={data.totalCases}
          subtitle="Across mapped locations"
          color="green"
          onClick={() => onNavigate("map")}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Anomaly Signals"
          value={data.anomalyCount}
          subtitle="Behavior outside baseline"
          color="red"
        />
        <MetricCard
          icon={Shield}
          label="High Risk Zones"
          value={data.highRiskCount}
          subtitle="Forecast score above threshold"
          color="amber"
        />
        <MetricCard
          icon={Users}
          label="Network MOs"
          value={data.moCount}
          subtitle="Recurring behavioral patterns"
          color="blue"
          onClick={() => onNavigate("graph")}
        />
      </section>

      {/* ─── district case load & crime typology ─── */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                District Case Load & Forecast
              </h3>
              <p className="text-sm text-green-600">
                Compare current incidents with predictive risk scoring.
              </p>
            </div>
            <button
              onClick={() => onNavigate("map")}
              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <MapPinned size={14} /> Open map
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={districtBars}>
                <CartesianGrid stroke="#e5efe5" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-16}
                  textAnchor="end"
                  height={62}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="cases"
                  name="Cases"
                  radius={[6, 6, 0, 0]}
                  fill="#16a34a"
                />
                <Line
                  dataKey="forecast"
                  name="Risk forecast"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-green-950">
              Crime Typology Mix
            </h3>
            <p className="text-sm text-green-600">
              Top categories in the current intelligence view.
            </p>
          </div>
          <div className="h-80">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={crimeMixColored}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive
                  >
                    {crimeMixColored.map((item, index) => (
                      <Cell
                        key={`cell-${item.name}-${index}`}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                    }}
                    labelStyle={{
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── trend analysis & behavioral radar ─── */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                Trend Analysis
              </h3>
              <p className="text-sm text-green-600">
                Longitudinal view by major crime category.
              </p>
            </div>
            <button
              onClick={() => onNavigate("trend")}
              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <TrendingUp size={14} /> Deep dive
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.timeline}>
                <CartesianGrid stroke="#e5efe5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="cases"
                  name="Cases"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#dc2626"
                  strokeWidth={3}
                />
                <Line
                  dataKey="sentiment"
                  name="Sentiment"
                  stroke="#7c3aed"
                  strokeWidth={3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-green-950">
              Behavioral Network Strength
            </h3>
            <p className="text-sm text-green-600">
              MO confidence across suspect clusters.
            </p>
          </div>
          <div className="h-80">
            {data.moNetwork.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.moNetwork}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="mo" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <RadarShape
                    dataKey="confidence"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.28}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-green-600">
                No MO patterns found for current filters
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── predictive risk & socio-economic ─── */}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <BrainCircuit size={18} className="text-green-700" />
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                Predictive Risk Scoring
              </h3>
              <p className="text-sm text-green-600">
                AI-driven flags for emerging risk areas.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {data.predictiveRisks
              .slice()
              .sort((a, b) => b.forecast - a.forecast)
              .slice(0, 5)
              .map((district) => (
                <div
                  key={district.id}
                  className="rounded-xl border border-green-100 bg-green-50/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-sm text-green-950">
                      {district.name}
                    </strong>
                    <Badge
                      className={cn(
                        district.risk === "high" &&
                          "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {district.forecast}
                    </Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        district.risk === "high"
                          ? "bg-red-500"
                          : district.risk === "medium"
                            ? "bg-yellow-400"
                            : "bg-green-500",
                      )}
                      style={{ width: `${district.forecast}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-green-700">
                    {district.anomaly}
                  </p>
                </div>
              ))}
            {data.predictiveRisks.length === 0 && (
              <p className="text-sm text-green-600">
                No risk data available for current filters
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-green-950">
              Socio-Economic Correlation
            </h3>
            <p className="text-sm text-green-600">
              Overlay crime volume with urbanization and unemployment
              indicators.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="#e5efe5" />
                <XAxis
                  type="number"
                  dataKey="urbanization"
                  name="Urbanization"
                  unit="%"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="unemployment"
                  name="Unemployment"
                  unit="%"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter
                  name="Districts"
                  data={data.socioeconomicPoints}
                  fill="#16a34a"
                >
                  {data.socioeconomicPoints.map((point) => (
                    <Cell
                      key={point.name}
                      fill={
                        point.forecast > 70
                          ? "#dc2626"
                          : point.forecast > 55
                            ? "#f59e0b"
                            : "#16a34a"
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ─── sentiment (kept as mock – no backend source) ─── */}
      <Card className="p-5">
        <div className="mb-5 flex items-center gap-2">
          <MessageSquareText size={18} className="text-green-700" />
          <div>
            <h3 className="text-lg font-semibold text-green-950">
              Sentiment Analysis
            </h3>
            <p className="text-sm text-green-600">
              Compares public tips, victim statements, social chatter, and
              informer notes.
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sentimentSeries}>
              <CartesianGrid stroke="#e5efe5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="positive"
                stackId="sentiment"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="neutral"
                stackId="sentiment"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="negative"
                stackId="sentiment"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ─── network & behavioral analysis ─── */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-950">
              Network & Behavioral Analysis
            </h3>
            <p className="text-sm text-green-600">
              Recurring MO patterns that connect suspects, vehicles, locations,
              and organized groups.
            </p>
          </div>
          <button
            onClick={() => onNavigate("graph")}
            className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800"
          >
            <GitBranch size={14} /> Open case board
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.moNetwork.map((item) => (
            <div
              key={item.mo}
              className="rounded-xl border border-green-100 bg-white p-4"
            >
              <strong className="text-sm text-green-950">{item.mo}</strong>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <span className="rounded-lg bg-green-50 p-2 text-xs text-green-700">
                  <b className="block text-base text-green-950">
                    {item.suspects}
                  </b>
                  Suspects
                </span>
                <span className="rounded-lg bg-green-50 p-2 text-xs text-green-700">
                  <b className="block text-base text-green-950">
                    {item.incidents}
                  </b>
                  Cases
                </span>
                <span className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  <b className="block text-base text-red-700">
                    {item.confidence}
                  </b>
                  Score
                </span>
              </div>
            </div>
          ))}
          {data.moNetwork.length === 0 && (
            <p className="col-span-full text-sm text-green-600">
              No MO patterns found for current filters
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  onClick,
}: any) {
  const colors: Record<string, { icon: string; border: string }> = {
    green: { icon: "bg-green-700 text-white", border: "border-green-100" },
    red: { icon: "bg-red-600 text-white", border: "border-red-100" },
    amber: { icon: "bg-amber-500 text-white", border: "border-amber-100" },
    blue: { icon: "bg-blue-600 text-white", border: "border-blue-100" },
  };
  const c = colors[color] || colors.green;
  return (
    <Card
      className={cn(
        "p-5 transition hover:shadow-md",
        c.border,
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
            c.icon,
          )}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-green-600">{label}</p>
          <strong className="block text-3xl font-bold tracking-tight text-green-950">
            {value}
          </strong>
          <p className="mt-0.5 text-xs text-green-500">{subtitle}</p>
        </div>
        <ArrowUpRight size={18} className="ml-auto text-green-300" />
      </div>
    </Card>
  );
}
