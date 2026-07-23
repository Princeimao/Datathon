export type RiskLevel = "high" | "medium" | "low" | "none";
export type TimeGrain = "day" | "week" | "month" | "year";

export type DistrictRisk = {
  id: string;
  name: string;
  state: string;
  region: "North" | "South" | "East" | "West" | "Central" | "North East";
  lat: number;
  lng: number;
  cases: number;
  risk: RiskLevel;
  trend: number;
  population: number;
  urbanization: number;
  unemployment: number;
  incomeIndex: number;
  forecast: number;
  anomaly: string;
  dominantCrime: string;
  sentiment: number;
  path?: string;
  label?: { x: number; y: number };
};

export type TrendPoint = {
  year: number;
  homicide: number;
  theft: number;
  cybercrime: number;
  assault: number;
  robbery: number;
};

export const districtRisks: DistrictRisk[] = [
  {
    id: "delhi-ncr",
    name: "Delhi NCR",
    state: "Delhi",
    region: "North",
    lat: 28.6139,
    lng: 77.209,
    cases: 384,
    risk: "high",
    trend: 22,
    population: 32900,
    urbanization: 97,
    unemployment: 8.1,
    incomeIndex: 78,
    forecast: 91,
    anomaly: "Cyber fraud and night snatching reports moved above the seasonal baseline",
    dominantCrime: "Cybercrime",
    sentiment: -68,
  },
  {
    id: "mumbai-mmr",
    name: "Mumbai MMR",
    state: "Maharashtra",
    region: "West",
    lat: 19.076,
    lng: 72.8777,
    cases: 341,
    risk: "high",
    trend: 17,
    population: 21600,
    urbanization: 92,
    unemployment: 6.9,
    incomeIndex: 82,
    forecast: 86,
    anomaly: "Financial fraud cluster shares mule-account routing and repeated call scripts",
    dominantCrime: "Fraud",
    sentiment: -57,
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    region: "South",
    lat: 12.9716,
    lng: 77.5946,
    cases: 318,
    risk: "high",
    trend: 19,
    population: 13200,
    urbanization: 91,
    unemployment: 7.8,
    incomeIndex: 74,
    forecast: 88,
    anomaly: "Tech corridor cybercrime and late-night vehicle theft overlap",
    dominantCrime: "Cybercrime",
    sentiment: -61,
  },
  {
    id: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    region: "East",
    lat: 22.5726,
    lng: 88.3639,
    cases: 236,
    risk: "medium",
    trend: 9,
    population: 15100,
    urbanization: 68,
    unemployment: 6.4,
    incomeIndex: 61,
    forecast: 64,
    anomaly: "Transit theft rose around market and rail-adjacent locations",
    dominantCrime: "Theft",
    sentiment: -42,
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    region: "South",
    lat: 17.385,
    lng: 78.4867,
    cases: 224,
    risk: "medium",
    trend: 12,
    population: 10800,
    urbanization: 83,
    unemployment: 6.2,
    incomeIndex: 70,
    forecast: 69,
    anomaly: "UPI refund fraud reports share a repeated caller pattern",
    dominantCrime: "Fraud",
    sentiment: -39,
  },
  {
    id: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    region: "South",
    lat: 13.0827,
    lng: 80.2707,
    cases: 211,
    risk: "medium",
    trend: 6,
    population: 11500,
    urbanization: 79,
    unemployment: 5.7,
    incomeIndex: 69,
    forecast: 58,
    anomaly: "Domestic assault calls increased during weekend heat bands",
    dominantCrime: "Assault",
    sentiment: -35,
  },
  {
    id: "lucknow",
    name: "Lucknow",
    state: "Uttar Pradesh",
    region: "North",
    lat: 26.8467,
    lng: 80.9462,
    cases: 205,
    risk: "medium",
    trend: 14,
    population: 3900,
    urbanization: 48,
    unemployment: 7.2,
    incomeIndex: 51,
    forecast: 71,
    anomaly: "Extortion calls and property disputes show shared number reuse",
    dominantCrime: "Extortion",
    sentiment: -49,
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    region: "West",
    lat: 23.0225,
    lng: 72.5714,
    cases: 188,
    risk: "medium",
    trend: 8,
    population: 8400,
    urbanization: 74,
    unemployment: 4.9,
    incomeIndex: 67,
    forecast: 62,
    anomaly: "Industrial belt thefts concentrate near shift-change windows",
    dominantCrime: "Theft",
    sentiment: -31,
  },
  {
    id: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    region: "North",
    lat: 26.9124,
    lng: 75.7873,
    cases: 162,
    risk: "low",
    trend: 3,
    population: 4100,
    urbanization: 52,
    unemployment: 5.4,
    incomeIndex: 58,
    forecast: 47,
    anomaly: "Tourist-area pickpocketing stayed within expected seasonal range",
    dominantCrime: "Theft",
    sentiment: -18,
  },
  {
    id: "bhopal",
    name: "Bhopal",
    state: "Madhya Pradesh",
    region: "Central",
    lat: 23.2599,
    lng: 77.4126,
    cases: 147,
    risk: "low",
    trend: -2,
    population: 2600,
    urbanization: 46,
    unemployment: 5.2,
    incomeIndex: 54,
    forecast: 39,
    anomaly: "No major deviation from property crime baseline",
    dominantCrime: "Property Crime",
    sentiment: -12,
  },
  {
    id: "patna",
    name: "Patna",
    state: "Bihar",
    region: "East",
    lat: 25.5941,
    lng: 85.1376,
    cases: 154,
    risk: "medium",
    trend: 10,
    population: 3200,
    urbanization: 39,
    unemployment: 7.5,
    incomeIndex: 44,
    forecast: 65,
    anomaly: "Railway-linked theft and missing-phone reports show repeated route timing",
    dominantCrime: "Theft",
    sentiment: -46,
  },
  {
    id: "guwahati",
    name: "Guwahati",
    state: "Assam",
    region: "North East",
    lat: 26.1445,
    lng: 91.7362,
    cases: 93,
    risk: "low",
    trend: 5,
    population: 1300,
    urbanization: 36,
    unemployment: 5.9,
    incomeIndex: 48,
    forecast: 42,
    anomaly: "Cross-border transport alerts remain below escalation threshold",
    dominantCrime: "Smuggling",
    sentiment: -21,
  },
  {
    id: "kochi",
    name: "Kochi",
    state: "Kerala",
    region: "South",
    lat: 9.9312,
    lng: 76.2673,
    cases: 88,
    risk: "none",
    trend: -8,
    population: 2100,
    urbanization: 61,
    unemployment: 4.1,
    incomeIndex: 72,
    forecast: 24,
    anomaly: "Below expected baseline across major categories",
    dominantCrime: "Minor Theft",
    sentiment: 9,
  },
];

export const trendSeries: TrendPoint[] = [
  { year: 2016, homicide: 372, theft: 1280, cybercrime: 210, assault: 816, robbery: 402 },
  { year: 2017, homicide: 351, theft: 1394, cybercrime: 268, assault: 842, robbery: 436 },
  { year: 2018, homicide: 364, theft: 1512, cybercrime: 341, assault: 881, robbery: 459 },
  { year: 2019, homicide: 377, theft: 1668, cybercrime: 438, assault: 929, robbery: 492 },
  { year: 2020, homicide: 338, theft: 1424, cybercrime: 594, assault: 804, robbery: 411 },
  { year: 2021, homicide: 389, theft: 1739, cybercrime: 742, assault: 914, robbery: 503 },
  { year: 2022, homicide: 407, theft: 1884, cybercrime: 927, assault: 972, robbery: 546 },
  { year: 2023, homicide: 421, theft: 1970, cybercrime: 1196, assault: 1031, robbery: 581 },
  { year: 2024, homicide: 448, theft: 2148, cybercrime: 1432, assault: 1094, robbery: 624 },
  { year: 2025, homicide: 472, theft: 2305, cybercrime: 1674, assault: 1168, robbery: 668 },
  { year: 2026, homicide: 436, theft: 2042, cybercrime: 1588, assault: 1057, robbery: 611 },
];

export const moNetwork = [
  { mo: "Helmet-masked two-wheeler", suspects: 26, incidents: 64, confidence: 89 },
  { mo: "False payment screenshot", suspects: 41, incidents: 113, confidence: 86 },
  { mo: "Night highway interception", suspects: 18, incidents: 39, confidence: 76 },
  { mo: "SIM swap account drain", suspects: 33, incidents: 92, confidence: 84 },
];

export const crimeMix = [
  { name: "Cybercrime", value: 1588, color: "#7c3aed" },
  { name: "Theft", value: 2042, color: "#2563eb" },
  { name: "Assault", value: 1057, color: "#f59e0b" },
  { name: "Robbery", value: 611, color: "#ef4444" },
  { name: "Homicide", value: 436, color: "#991b1b" },
];

export const sentimentSeries = [
  { label: "Public tips", positive: 42, neutral: 31, negative: 27 },
  { label: "Victim statements", positive: 9, neutral: 34, negative: 57 },
  { label: "Social chatter", positive: 18, neutral: 43, negative: 39 },
  { label: "Informer notes", positive: 21, neutral: 49, negative: 30 },
];

export function buildTimeline(grain: TimeGrain, category = "cybercrime", multiplier = 1) {
  const labels: Record<TimeGrain, string[]> = {
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    week: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    year: trendSeries.map((item) => String(item.year)),
  };
  const categoryTotals = trendSeries.map((item) => (item as any)[category] || item.cybercrime);
  const base = categoryTotals[categoryTotals.length - 1] || 100;
  return labels[grain].map((label, index) => {
    const yearValue = Number(label);
    const raw = grain === "year" && yearValue
      ? categoryTotals[trendSeries.findIndex((item) => item.year === yearValue)] || base
      : base * (0.68 + index * 0.045 + (index % 3) * 0.08);
    const cases = Math.round(raw * multiplier / (grain === "day" ? 52 : grain === "week" ? 18 : grain === "month" ? 8 : 1));
    return {
      label,
      cases,
      forecast: Math.round(cases * 1.12),
      sentiment: Math.max(-82, Math.min(36, -28 - index * 2 + Math.round((multiplier - 1) * 12))),
    };
  });
}

export const socioeconomicPoints = districtRisks.map((district) => ({
  name: district.name,
  urbanization: district.urbanization,
  unemployment: district.unemployment,
  cases: district.cases,
  forecast: district.forecast,
}));
