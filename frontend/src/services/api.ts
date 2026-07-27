import axios, { AxiosRequestConfig } from "axios";

const API_BASE = "https://tasc.development.catalystappsail.in/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.statusText ||
      error.message ||
      "Request failed";

    return Promise.reject(new Error(message));
  },
);

async function request(path: string, config: AxiosRequestConfig = {}) {
  return apiClient({
    url: path,
    ...config,
  });
}

export const api = {
  // Visualization endpoints
  geospatial: () => request("/visualization/geospatial"),

  districtStats: () => request("/visualization/district-stats"),

  trends: () => request("/visualization/trends"),

  network: () => request("/visualization/network"),

  repeatOffenders: () => request("/visualization/repeat-offenders"),

  associations: () => request("/visualization/associations"),

  predictive: () => request("/visualization/predictive"),

  anomalies: () => request("/visualization/anomalies"),

  timeline: (groupBy = "month") =>
    request(`/visualization/timeline?groupBy=${groupBy}`),

  similarPersons: (personId: string) =>
    request(`/visualization/similar-persons/${personId}`),

  caseBoard: (caseId: string) => request(`/visualization/case-board/${caseId}`),

  graph: (payload: any) => {
    const params = new URLSearchParams();

    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    return request(`/visualization/network?${params.toString()}`);
  },

  updateRelationship: (id: string, payload: any) =>
    request(`/visualization/relationships/${id}`, {
      method: "PATCH",
      data: payload,
    }),

  updatePerson: (id: string, payload: any) =>
    request(`/visualization/persons/${id}`, {
      method: "PATCH",
      data: payload,
    }),

  updateIncident: (id: string, payload: any) =>
    request(`/visualization/incidents/${id}`, {
      method: "PATCH",
      data: payload,
    }),

  updateLocation: (id: string, payload: any) =>
    request(`/visualization/locations/${id}`, {
      method: "PATCH",
      data: payload,
    }),

  predictSimilarity: (payload: any) =>
    request("/visualization/similarity/predict", {
      method: "POST",
      data: payload,
    }),

  applySimilarity: (payload: any) =>
    request("/visualization/similarity/apply", {
      method: "POST",
      data: payload,
    }),

  // Data import
  importBulk: (payload: any) =>
    request("/data/process", {
      method: "POST",
      data: payload,
    }),

  // Dashboard summary
  dashboardSummary: (params?: {
    state?: string;
    crimeType?: string;
    groupBy?: string;
  }) => {
    const p = new URLSearchParams();

    if (params?.state && params.state !== "all") p.set("state", params.state);

    if (params?.crimeType && params.crimeType !== "all")
      p.set("crimeType", params.crimeType);

    if (params?.groupBy) p.set("groupBy", params.groupBy);

    return request(
      `/visualization/dashboard-summary${
        p.toString() ? `?${p.toString()}` : ""
      }`,
    );
  },

  // Map data
  mapData: (filters?: {
    state?: string;
    district?: string;
    crimeType?: string;
    stationId?: string;
    dateFrom?: string;
    dateTo?: string;
    riskLevel?: string;
  }) => {
    const p = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (
          value &&
          value !== "All States" &&
          value !== "All Cities" &&
          value !== "All Crime Types" &&
          value !== "All Risk Levels"
        ) {
          p.set(key, value);
        }
      });
    }

    return request(
      `/visualization/map-data${p.toString() ? `?${p.toString()}` : ""}`,
    );
  },

  getSignedUrl: async (data: { fileName: string; contentType: string }) => {
    const res = await apiClient.post("/storage/signed-url", data);
    return res;
  },

  searchSimilarity: async (data: any) => {
    const res = await apiClient.post("/similarity/search", data);
    return res;
  },
};
