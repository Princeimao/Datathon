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

  // Location endpoints

  states: () => request("/location/states"),
  districts: () => request("/location/districts"),

  stateBoundary: (stateId: number | string) =>
    request(`/location/states/${stateId}/boundary`),

  districtBoundary: (districtId: number | string) =>
    request(`/location/districts/${districtId}/boundary`),

  policeStations: (params: { state?: string; district?: string }) => {
    if (params.district) {
      return request(`/police/city/${encodeURIComponent(params.district)}`);
    }

    if (params.state) {
      return request(`/police/state/${encodeURIComponent(params.state)}`);
    }

    return Promise.resolve({ stations: [] });
  },

  // Map data
  mapData: (filters?: {
    state?: string;
    district?: string;
    policeUnitId?: string;
    crimeType?: string;
    heatmapLayer?: string;
    timeOfDay?: string;
    year?: string;
    dateFrom?: string;
    dateTo?: string;
    riskLevel?: string;
    minCases?: number;
    moConfidence?: number;
    moPatterns?: string[];
    activeAlerts?: boolean;
  }) => {
    const p = new URLSearchParams();

    if (filters) {
      const effective = { ...filters };

      // The Heatmap Layer drives the backend crime-type query when the
      // investigator has not picked an explicit crime type.
      const heatmapCrimeTypes: Record<string, string> = {
        "Theft Hotspots": "Theft",
        "Cybercrime Hotspots": "Cybercrime",
        "Assault Hotspots": "Assault",
        "Robbery Hotspots": "Robbery",
        "Homicide Hotspots": "Homicide",
      };

      if (
        (!effective.crimeType || effective.crimeType === "All Crime Types") &&
        effective.heatmapLayer &&
        heatmapCrimeTypes[effective.heatmapLayer]
      ) {
        effective.crimeType = heatmapCrimeTypes[effective.heatmapLayer];
      }

      Object.entries(effective).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (key === "moPatterns") {
          if (Array.isArray(value) && value.length) p.set(key, value.join(","));
          return;
        }

        if (key === "heatmapLayer") return;

        if (typeof value === "boolean") {
          if (value) p.set(key, "true");
          return;
        }

        if (
          value === "All States" ||
          value === "All Districts" ||
          value === "All Cities" ||
          value === "All Stations" ||
          value === "All Crime Types" ||
          value === "All Risk Levels" ||
          value === "All Day" ||
          value === "All Layers" ||
          value === "All Years"
        ) {
          return;
        }

        p.set(key, String(value));
      });
    }

    return request(
      `/visualization/map-data${p.toString() ? `?${p.toString()}` : ""}`,
    );
  },

  getSignedUrl: async (data: {
    fileName: string;
    contentType: string;
    keyPrefix?: string;
  }) => {
    const res = await apiClient.post("/storage/signed-url", data);
    return res;
  },

  getSignedGetUrl: async (data: { objectKey: string }) => {
    const res = await apiClient.get(
      `/storage/signed-get?objectKey=${encodeURIComponent(data.objectKey)}`,
    );
    return res;
  },

  searchSimilarity: async (data: any) => {
    const res = await apiClient.post("/similarity/search", data);
    return res;
  },

  investigation: (caseId: string) => {
    return request(`/similarity/investigation/${caseId}`);
  },

  // Structured (manual) case/person insertion
  structuredIngest: (payload: any) =>
    request("/ingest/structured", {
      method: "POST",
      data: payload,
    }),

  // Case Board multi-perspective search
  caseBoardSearch: (params: {
    q: string;
    types?: string[];
    limit?: number;
  }) => {
    const p = new URLSearchParams();

    p.set("q", params.q);

    if (params.types?.length) p.set("types", params.types.join(","));

    if (params.limit) p.set("limit", String(params.limit));

    return request(`/visualization/search?${p.toString()}`);
  },

  // Luxand face recognition
  enrollFace: (payload: any) =>
    request("/faces/enroll", {
      method: "POST",
      data: payload,
    }),

  searchFaces: (payload: any) =>
    request("/faces/search", {
      method: "POST",
      data: payload,
    }),

  facesSubjects: () => request("/faces/subjects"),

  personFaces: (personId: string) => request(`/faces/person/${personId}`),
};
