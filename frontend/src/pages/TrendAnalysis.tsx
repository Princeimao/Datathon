import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarRange,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildTimeline,
  districtRisks,
  sentimentSeries,
  trendSeries,
  type TimeGrain,
} from "../analyticsData";
import { Card, Select } from "../components/customUi";

const categories = [
  { key: "theft", label: "Theft", color: "#2563eb" },
  { key: "cybercrime", label: "Cybercrime", color: "#7c3aed" },
  { key: "assault", label: "Assault", color: "#f59e0b" },
  { key: "robbery", label: "Robbery", color: "#ef4444" },
  { key: "homicide", label: "Homicide", color: "#991b1b" },
];

export default function TrendAnalysis() {
  const [category, setCategory] = useState("cybercrime");
  const [locationId, setLocationId] = useState("all");
  const [state, setState] = useState("all");
  const [grain, setGrain] = useState<TimeGrain>("year");
  const [year, setYear] = useState("2026");

  const states = useMemo(
    () => Array.from(new Set(districtRisks.map((item) => item.state))).sort(),
    [],
  );
  const location = districtRisks.find((item) => item.id === locationId);
  const stateLocations =
    state === "all"
      ? districtRisks
      : districtRisks.filter((item) => item.state === state);
  const multiplier = location
    ? Math.max(0.35, location.cases / 240)
    : state === "all"
      ? 1
      : Math.max(
          0.35,
          stateLocations.reduce((sum, item) => sum + item.cases, 0) / 540,
        );
  const currentCategory =
    categories.find((item) => item.key === category) || categories[1];
  const trendData = buildTimeline(grain, category, multiplier);

  const anomalyBars = stateLocations.map((item) => ({
    name: item.name,
    anomaly:
      item.risk === "high" ? item.forecast : Math.round(item.forecast * 0.62),
  }));

  const categoryComparison =
    grain === "year"
      ? trendSeries.map((item) => ({ ...item, label: String(item.year) }))
      : buildTimeline(grain, "theft", multiplier).map((point, index) => ({
          label: point.label,
          theft: point.cases,
          cybercrime: buildTimeline(grain, "cybercrime", multiplier)[index]
            .cases,
          assault: buildTimeline(grain, "assault", multiplier)[index].cases,
          robbery: buildTimeline(grain, "robbery", multiplier)[index].cases,
          homicide: buildTimeline(grain, "homicide", multiplier)[index].cases,
        }));

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-green-600">
              <CalendarRange size={14} /> India-wide historical and predictive
              view
            </div>
            <h3 className="text-xl font-semibold text-green-950">
              Trend Analysis
            </h3>
            <p className="text-sm text-green-600">
              Go back by day, week, month, or year to compare crime growth,
              risk, and sentiment.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setLocationId("all");
              }}
              className="w-44"
            >
              <option value="all">All India</option>
              {states.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <Select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="w-48"
            >
              <option value="all">All locations</option>
              {stateLocations.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
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
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-32"
            >
              {trendSeries.map((item) => (
                <option key={item.year}>{item.year}</option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-44"
            >
              {categories.map((item) => (
                <option value={item.key} key={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                {currentCategory.label} Trend
              </h3>
              <p className="text-sm text-green-600">
                {location
                  ? location.name
                  : state === "all"
                    ? "All India"
                    : state}{" "}
                - {grain} view for {year}
              </p>
            </div>
            <TrendingUp size={20} className="text-green-700" />
          </div>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient
                    id="selectedTrend"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={currentCategory.color}
                      stopOpacity={0.38}
                    />
                    <stop
                      offset="95%"
                      stopColor={currentCategory.color}
                      stopOpacity={0.04}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5efe5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  dataKey="cases"
                  name="Actual cases"
                  type="monotone"
                  stroke={currentCategory.color}
                  strokeWidth={3}
                  fill="url(#selectedTrend)"
                />
                <Line
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#dc2626"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                />
                <Line
                  dataKey="sentiment"
                  name="Sentiment"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <BrainCircuit size={18} className="text-green-700" />
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                Predictive Risk Scoring
              </h3>
              <p className="text-sm text-green-600">
                Emerging high-risk areas from hidden correlations.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {stateLocations
              .slice()
              .sort((a, b) => b.forecast - a.forecast)
              .slice(0, 6)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-green-100 bg-green-50/50 p-3"
                >
                  <div className="mb-1 flex justify-between text-sm">
                    <strong className="text-green-950">{item.name}</strong>
                    <span
                      className={
                        item.risk === "high"
                          ? "font-bold text-red-600"
                          : "font-bold text-green-700"
                      }
                    >
                      {item.forecast}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white">
                    <div
                      className={
                        item.risk === "high"
                          ? "h-full rounded-full bg-red-500"
                          : "h-full rounded-full bg-green-500"
                      }
                      style={{ width: `${item.forecast}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-green-700">
                    {item.dominantCrime} - sentiment {item.sentiment}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-green-950">
              Category Comparison
            </h3>
            <p className="text-sm text-green-600">
              Major typologies side by side for the selected time window.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={categoryComparison}>
                <CartesianGrid stroke="#e5efe5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {categories.map((item) => (
                  <Line
                    key={item.key}
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-950">
                Anomaly Detection
              </h3>
              <p className="text-sm text-green-600">
                Locations deviating from normal behavioral patterns.
              </p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anomalyBars}>
                <CartesianGrid stroke="#e5efe5" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="anomaly"
                  name="Anomaly score"
                  fill="#dc2626"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-5 flex items-center gap-2">
          <MessageSquareText size={18} className="text-green-700" />
          <div>
            <h3 className="text-lg font-semibold text-green-950">
              Sentiment Analysis
            </h3>
            <p className="text-sm text-green-600">
              Negative sentiment helps prioritize locations where victim
              statements and public signals show rising urgency.
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
              <Bar dataKey="positive" stackId="sentiment" fill="#16a34a" />
              <Bar dataKey="neutral" stackId="sentiment" fill="#94a3b8" />
              <Bar dataKey="negative" stackId="sentiment" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
