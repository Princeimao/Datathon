import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import {
  Building2,
  Car,
  CircleHelp,
  FileText,
  FlaskConical,
  Footprints,
  Home,
  Image,
  Link2,
  Loader2,
  MapPinned,
  Phone,
  RefreshCw,
  Save,
  Search,
  Skull,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { demoGraph } from "../demoGraph";
import {
  Badge,
  Button,
  Card,
  GhostButton,
  Input,
  Sheet,
  Textarea,
} from "../components/customUi";
import { cn } from "../lib/utils";
import { getForceLayout } from "../lib/forceLayout";

const redString = {
  type: "straight",
  animated: false,
  style: { stroke: "#be123c", strokeWidth: 3.5 },
  labelStyle: { fill: "#881337", fontWeight: 700, fontSize: 11 },
  labelBgStyle: { fill: "#fff7ed", fillOpacity: 0.92 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#be123c" },
};

const SEARCH_TYPES = [
  { id: "case", label: "Cases", icon: FileText },
  { id: "person", label: "People", icon: UserRound },
  { id: "evidence", label: "Evidence", icon: Link2 },
  { id: "statement", label: "Statements", icon: FileText },
  { id: "phone", label: "Phones", icon: Phone },
  { id: "vehicle", label: "Vehicles", icon: Car },
  { id: "location", label: "Locations", icon: MapPinned },
  { id: "organization", label: "Organizations", icon: Building2 },
];

function normalizeEdges(items: any[]) {
  return items.map((edge) => ({
    ...redString,
    ...edge,
    type: "straight",
    style: redString.style,
    markerEnd: redString.markerEnd,
  }));
}

function Pin({ tone = "red" }: { tone?: "red" | "amber" | "slate" }) {
  const colors = {
    red: "bg-red-600 shadow-red-200",
    amber: "bg-amber-500 shadow-amber-200",
    slate: "bg-slate-500 shadow-slate-200",
  };
  return (
    <span
      className={cn(
        "absolute left-1/2 top-[-9px] z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-md",
        colors[tone],
      )}
    />
  );
}

function BoardPaper({ children, className, tone = "red" }: any) {
  return (
    <div
      className={cn(
        "relative rotate-[-1deg] border bg-[#fffdf8] p-3 shadow-xl transition hover:rotate-0 hover:shadow-2xl",
        className,
      )}
    >
      <Pin tone={tone} />
      <div className="absolute -bottom-2 left-4 h-4 w-16 rotate-[-2deg] bg-amber-200/70" />
      {children}
    </div>
  );
}

function MetaList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 grid gap-1.5 text-[11px] text-slate-500">
      {items.slice(0, 4).map((item) => (
        <li className="rounded-lg bg-slate-50 px-2 py-1" key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function PersonNode({ data }: any) {
  const fatal =
    `${data.role || ""} ${data.label || ""}`
      .toLowerCase()
      .includes("deceased") ||
    `${data.role || ""}`.toLowerCase().includes("victim");
  return (
    <BoardPaper
      className="w-[280px] border-blue-100"
      tone={fatal ? "red" : "amber"}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex gap-3">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt=""
            className="h-16 w-16 border-4 border-white object-cover shadow-md"
          />
        ) : fatal ? (
          <div className="grid h-16 w-16 place-items-center border-4 border-white bg-red-50 text-red-600 shadow-md">
            <Skull size={28} />
          </div>
        ) : (
          <div className="grid h-16 w-16 place-items-center border-4 border-white bg-slate-100 text-slate-500 shadow-md">
            <CircleHelp size={30} />
          </div>
        )}
        <div className="min-w-0">
          <strong className="block truncate text-sm">{data.label}</strong>
          <span className="text-xs text-slate-500">
            {data.role || "Person"}
          </span>
          <div className="mt-2 flex gap-1">
            <Badge
              className={
                fatal
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-blue-100 bg-blue-50 text-blue-700"
              }
            >
              {fatal ? "Fatal / victim" : `Risk ${data.riskScore ?? "N/A"}`}
            </Badge>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {data.relationToCase ||
          `${data.suspectCaseCount || 0} suspect links, ${data.incidentCount || 0} total cases.`}
      </p>
      <MetaList items={data.metadata || data.aliases} />
      <Handle type="source" position={Position.Right} />
    </BoardPaper>
  );
}

function IncidentNode({ data }: any) {
  return (
    <BoardPaper className="w-[260px] rotate-[1.2deg] border-red-100" tone="red">
      <Handle type="target" position={Position.Left} />
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600">
          <FileText size={20} />
        </div>
        <div>
          <strong className="block text-sm">{data.title}</strong>
          <span className="text-xs text-slate-500">
            {data.incidentNumber || data.status}
          </span>
        </div>
      </div>
      <Badge className="border-red-100 bg-red-50 text-red-700">
        {data.category || "Uncategorized"}
      </Badge>
      <MetaList items={data.metadata} />
      <Handle type="source" position={Position.Right} />
    </BoardPaper>
  );
}

function LocationNode({ data }: any) {
  return (
    <BoardPaper
      className="w-[270px] rotate-[0.8deg] border-emerald-100"
      tone="slate"
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
          <MapPinned size={20} />
        </div>
        <div>
          <strong className="block text-sm">{data.title}</strong>
          <span className="text-xs text-slate-500">
            {data.district || data.city || "Unknown district"}
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-[linear-gradient(135deg,#dcfce7,#dbeafe)] p-3 text-xs text-slate-700">
        {data.latitude && data.longitude
          ? `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`
          : "No map coordinates"}
      </div>
      <MetaList items={data.metadata} />
      <Handle type="source" position={Position.Right} />
    </BoardPaper>
  );
}

function VehicleNode({ data }: any) {
  return (
    <BoardPaper
      className="w-[230px] rotate-[-1.4deg] border-amber-100"
      tone="amber"
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <Car className="text-amber-600" size={22} />
        <strong className="text-sm">
          {data.registrationNo || data.title || "Vehicle"}
        </strong>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {[data.color, data.make, data.model].filter(Boolean).join(" ")}
      </p>
      <MetaList items={data.metadata} />
      <Handle type="source" position={Position.Right} />
    </BoardPaper>
  );
}

function SimpleNode({ data }: any) {
  const Icon =
    data.entityType === "modusOperandi"
      ? FlaskConical
      : data.entityType === "evidence"
        ? Link2
        : Home;
  const evidenceIcon = data.title?.toLowerCase().includes("fingerprint")
    ? FingerprintFallback
    : data.title?.toLowerCase().includes("cctv")
      ? Image
      : data.title?.toLowerCase().includes("shoe")
        ? Footprints
        : Icon;
  const EvidenceIcon = evidenceIcon;
  return (
    <BoardPaper
      className="w-[250px] border-slate-200"
      tone={data.entityType === "evidence" ? "red" : "slate"}
    >
      <Handle type="target" position={Position.Left} />
      {data.entityType === "evidence" && (
        <div className="mb-3 grid h-28 place-items-center overflow-hidden border border-slate-200 bg-slate-100">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <EvidenceIcon size={42} className="text-slate-500" />
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-slate-500" />
        <strong className="text-sm">
          {data.title ||
            data.registrationNo ||
            data.caseNumber ||
            data.code ||
            "Node"}
        </strong>
      </div>
      <span className="mt-2 block text-xs text-slate-500">
        {data.category || data.entityType}
      </span>
      <MetaList items={data.metadata} />
      <Handle type="source" position={Position.Right} />
    </BoardPaper>
  );
}

function FingerprintFallback(props: any) {
  return (
    <span
      className="text-5xl font-black leading-none text-slate-500"
      {...props}
    >
      ?
    </span>
  );
}

const nodeTypes = {
  personNode: PersonNode,
  incidentNode: IncidentNode,
  locationNode: LocationNode,
  caseNode: SimpleNode,
  moNode: SimpleNode,
  vehicleNode: VehicleNode,
  evidenceNode: SimpleNode,
};

function caseCrimeType(caseItem: any) {
  return (
    caseItem.crimeMinorHead?.crimeHeadName ||
    caseItem.crimeMajorHead?.crimeGroupName ||
    "Unknown"
  );
}

function caseStatus(caseItem: any) {
  return caseItem.caseStatus?.caseStatusName || "Unknown";
}

export default function IntelligenceGraph({ filters = {} }: any) {
  const [searchParams] = useSearchParams();

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const [caseId, setCaseId] = useState("");
  const [personId, setPersonId] = useState("");
  const [freeQuery, setFreeQuery] = useState("");

  const [status, setStatus] = useState(
    "Select a case or person to load the graph",
  );
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTypes, setSearchTypes] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  /**
   * Load graph from backend.
   *
   * IMPORTANT:
   * This function does NOT depend on caseId/personId state.
   * The selected ID is explicitly passed to it.
   */
  async function loadGraph(opts?: {
    caseId?: string;
    personId?: string;
    query?: string;
  }) {
    const targetCaseId = opts?.caseId || "";
    const targetPersonId = opts?.personId || "";
    const targetQuery = opts?.query !== undefined ? opts.query : freeQuery;

    if (!targetCaseId && !targetPersonId && !targetQuery.trim()) {
      setNodes([]);
      setEdges([]);
      setStatus("Select a case or person to load the graph");
      return;
    }

    setLoading(true);
    setStatus("Loading scoped graph");

    try {
      const graph: any = await api.graph({
        ...(targetCaseId
          ? {
              incidentId: targetCaseId,
            }
          : {}),

        ...(targetPersonId
          ? {
              personId: targetPersonId,
            }
          : {}),

        ...(targetQuery.trim()
          ? {
              q: targetQuery.trim(),
            }
          : {}),

        ...(filters.district
          ? {
              district: filters.district,
            }
          : {}),

        ...(filters.category
          ? {
              category: filters.category,
            }
          : {}),

        depth: 2,
        limit: 140,
      });

      console.log("Graph API response:", graph);

      const apiNodes = graph?.data?.nodes ?? [];
      const apiEdges = graph?.data?.edges ?? [];

      console.log("Graph API nodes:", apiNodes);
      console.log("Graph API edges:", apiEdges);

      if (!Array.isArray(apiNodes)) {
        throw new Error("Graph API returned invalid nodes");
      }

      if (!Array.isArray(apiEdges)) {
        throw new Error("Graph API returned invalid edges");
      }

      /**
       * No demo fallback here.
       *
       * If backend returns no nodes, React Flow will simply
       * display an empty graph.
       */
      if (apiNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        setStatus("No graph data found");
        return;
      }

      const normalizedEdges = normalizeEdges(apiEdges);

      console.log("Normalized edges:", normalizedEdges);

      /**
       * Make sure getForceLayout returns React Flow compatible nodes:
       *
       * {
       *   id: "...",
       *   position: { x: 100, y: 200 },
       *   data: {...}
       * }
       */
      const layoutedGraph = getForceLayout(apiNodes, normalizedEdges);

      console.log("Layouted nodes:", layoutedGraph.nodes);

      console.log("Layouted edges:", layoutedGraph.edges);

      setNodes(layoutedGraph.nodes);
      setEdges(layoutedGraph.edges);

      setStatus(
        `${layoutedGraph.nodes.length} nodes • ${layoutedGraph.edges.length} relationships`,
      );
    } catch (err: any) {
      console.error("Failed to load graph:", err);

      setNodes([]);
      setEdges([]);

      setStatus(err?.message || "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Initial URL case.
   *
   * This deliberately runs only once.
   *
   * Do NOT add loadGraph to this dependency array,
   * otherwise changes in functions/state can cause
   * repeated backend calls.
   */
  useEffect(() => {
    const initialCaseId = searchParams.get("caseId");

    if (!initialCaseId) {
      return;
    }

    setCaseId(initialCaseId);
    setPersonId("");

    loadGraph({
      caseId: initialCaseId,
    });

    // Initial URL load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * React Flow node changes.
   */
  const onNodesChange = useCallback((changes: any) => {
    setNodes((items) => applyNodeChanges(changes, items));
  }, []);

  /**
   * React Flow edge changes.
   */
  const onEdgesChange = useCallback((changes: any) => {
    setEdges((items) => applyEdgeChanges(changes, items));
  }, []);

  /**
   * Manual connection between nodes.
   */
  const onConnect = useCallback((params: any) => {
    setEdges((items) =>
      addEdge(
        {
          ...redString,
          ...params,
          label: "manual link",
        },
        items,
      ),
    );
  }, []);

  /**
   * Selected entity.
   */
  const selectedEntity = useMemo(() => {
    if (!selected) {
      return null;
    }

    if (selected.source && selected.target) {
      return {
        kind: "edge",
        ...selected,
      };
    }

    return {
      kind: "node",
      ...selected,
    };
  }, [selected]);

  /**
   * Save selected graph entity.
   */
  async function saveSelected() {
    if (!selectedEntity) {
      return;
    }

    const entityType = selectedEntity.data?.entityType;

    const recordId = selectedEntity.data?.recordId;

    if (!recordId) {
      setStatus("Cannot save: missing record ID");
      return;
    }

    setStatus("Saving verified correction");

    try {
      if (selectedEntity.kind === "edge" && entityType === "relationship") {
        await api.updateRelationship(recordId, draft);
      }

      if (entityType === "person") {
        await api.updatePerson(recordId, draft);
      }

      if (entityType === "incident") {
        await api.updateIncident(recordId, draft);
      }

      if (entityType === "location") {
        await api.updateLocation(recordId, draft);
      }

      setStatus("Saved");
    } catch (err: any) {
      console.error("Failed to save:", err);

      setStatus(err?.message || "Failed to save changes");
    }
  }

  /**
   * Search field toggle.
   */
  function toggleSearchType(type: string) {
    setSearchTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  /**
   * Search backend.
   */
  async function runSearch() {
    const q = searchQuery.trim();

    if (!q) {
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const res: any = await api.caseBoardSearch({
        q,
        types: searchTypes.length ? searchTypes : undefined,
        limit: 20,
      });

      console.log("Search response:", res);

      setSearchResults(res);
    } catch (err: any) {
      console.error("Search failed:", err);

      setSearchError(err?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  /**
   * Open case from search result.
   */
  function openCase(id: string) {
    if (!id) {
      return;
    }

    setCaseId(id);
    setPersonId("");
    setSelected(null);

    loadGraph({
      caseId: id,
    });
  }

  /**
   * Open person from search result.
   */
  function openPerson(id: string) {
    if (!id) {
      return;
    }

    setPersonId(id);
    setCaseId("");
    setSelected(null);

    loadGraph({
      personId: id,
    });
  }

  /**
   * Reload currently selected graph.
   */
  function reloadGraph() {
    if (caseId) {
      loadGraph({
        caseId,
      });

      return;
    }

    if (personId) {
      loadGraph({
        personId,
      });

      return;
    }

    if (freeQuery.trim()) {
      loadGraph({
        query: freeQuery,
      });

      return;
    }

    setStatus("Select a case or person to load the graph");
  }

  const resultGroups = searchResults?.results || {};

  return (
    <div className="space-y-4">
      {/* =========================================================
          SEARCH BAR
      ========================================================== */}

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="min-w-[280px] flex-1"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                runSearch();
              }
            }}
            placeholder="Search cases, people, evidence, statements, phones…"
          />

          <Button
            onClick={runSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}
            Search board
          </Button>

          <GhostButton
            onClick={reloadGraph}
            disabled={loading || (!caseId && !personId && !freeQuery.trim())}
          >
            <RefreshCw size={16} />
            Reload graph
          </GhostButton>

          <Badge>{loading ? "Loading..." : status}</Badge>
        </div>

        {/* Search fields */}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Fields:</span>

          {SEARCH_TYPES.map((item) => {
            const Icon = item.icon;

            const active = searchTypes.includes(item.id);

            return (
              <button
                key={item.id}
                onClick={() => toggleSearchType(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",

                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                )}
              >
                <Icon size={12} />

                {item.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* =========================================================
          SEARCH RESULTS
      ========================================================== */}

      {searchResults && (
        <Card className="border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Search results for “{searchResults.query}”
            </h3>

            <div className="flex items-center gap-2">
              <Badge>{searchResults.total} matches</Badge>

              <GhostButton onClick={() => setSearchResults(null)}>
                <X size={14} />
                Clear
              </GhostButton>
            </div>
          </div>

          {searchResults.total === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              No matches across the selected fields.
            </p>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* CASES */}

            {resultGroups.cases?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cases ({resultGroups.cases.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.cases.map((caseItem: any) => (
                    <button
                      key={caseItem.id}
                      onClick={() => openCase(caseItem.id)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {caseItem.title || caseItem.caseNumber}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {caseItem.caseNumber} • {caseCrimeType(caseItem)} •{" "}
                        {caseStatus(caseItem)} • {caseItem.persons?.length || 0}{" "}
                        people • {caseItem.evidences?.length || 0} evidence
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PEOPLE */}

            {resultGroups.persons?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  People ({resultGroups.persons.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.persons.map((person: any) => (
                    <button
                      key={person.id}
                      onClick={() => openPerson(person.id)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {person.name || "Unknown Person"}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {[
                          person.aliases?.length
                            ? `Aliases: ${person.aliases.join(", ")}`
                            : null,

                          `${person.caseRoles?.length || 0} case links`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EVIDENCE */}

            {resultGroups.evidence?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Evidence / media ({resultGroups.evidence.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.evidence.map((evidence: any) => (
                    <button
                      key={evidence.id}
                      onClick={() => openCase(evidence.caseId)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {evidence.title || evidence.fileName || evidence.type}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {evidence.type} • {evidence.case?.caseNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STATEMENTS */}

            {resultGroups.statements?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Statements ({resultGroups.statements.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.statements.map(
                    (statement: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => openCase(statement.caseId)}
                        className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                      >
                        <p className="line-clamp-2 text-sm text-slate-800">
                          {statement.statement}
                        </p>

                        <span className="mt-1 block text-xs text-slate-500">
                          {statement.person?.name ||
                            statement.case?.caseNumber ||
                            "Statement"}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* PHONES */}

            {resultGroups.phones?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Phone numbers ({resultGroups.phones.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.phones.map((phone: any) => (
                    <button
                      key={phone.id}
                      onClick={() => openCase(phone.cases?.[0]?.caseId)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {phone.number}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {phone.owners
                          ?.map((owner: any) => owner.person.name)
                          .filter(Boolean)
                          .join(", ") || "No registered owner"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* VEHICLES */}

            {resultGroups.vehicles?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Vehicles ({resultGroups.vehicles.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.vehicles.map((vehicle: any) => (
                    <button
                      key={vehicle.id}
                      onClick={() => openCase(vehicle.cases?.[0]?.caseId)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {vehicle.registrationNo || "Vehicle"}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {[vehicle.make, vehicle.model, vehicle.color]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LOCATIONS */}

            {resultGroups.locations?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Locations ({resultGroups.locations.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.locations.map((location: any) => (
                    <button
                      key={location.id}
                      onClick={() => openCase(location.cases?.[0]?.caseId)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {location.address || "Location"}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {[
                          location.district?.districtName,

                          location.policeUnit?.unitName,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ORGANIZATIONS */}

            {resultGroups.organizations?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Organizations ({resultGroups.organizations.length})
                </h4>

                <div className="grid gap-2">
                  {resultGroups.organizations.map((organization: any) => (
                    <button
                      key={organization.id}
                      onClick={() => openCase(organization.cases?.[0]?.caseId)}
                      className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <strong className="block text-sm text-slate-900">
                        {organization.name}
                      </strong>

                      <span className="text-xs text-slate-500">
                        {organization.organizationType ||
                          `${organization.members?.length || 0} members`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* =========================================================
          SEARCH ERROR
      ========================================================== */}

      {searchError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {searchError}
        </Card>
      )}

      {/* =========================================================
          REACT FLOW
      ========================================================== */}

      <Card className="h-[600px] overflow-hidden border-amber-200 bg-[#f3dfbb] case-board">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            setSelected(node);
            setDraft(node.data || {});
          }}
          onEdgeClick={(_, edge) => {
            setSelected(edge);
            setDraft(edge.data || {});
          }}
          fitView
          fitViewOptions={{
            padding: 0.25,
            maxZoom: 1.2,
          }}
          minZoom={0.05}
        >
          <Background color="#d4a373" gap={28} />

          <Controls />

          <MiniMap pannable zoomable />
        </ReactFlow>
      </Card>

      {/* =========================================================
          SELECTED ENTITY SHEET
      ========================================================== */}

      <Sheet open={Boolean(selectedEntity)} onClose={() => setSelected(null)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Selected intelligence
            </p>

            <h3 className="mt-1 text-2xl font-semibold tracking-tight">
              {draft.label ||
                draft.title ||
                draft.registrationNo ||
                selectedEntity?.label ||
                "Graph element"}
            </h3>
          </div>

          <GhostButton onClick={() => setSelected(null)}>
            <X size={18} />
          </GhostButton>
        </div>

        <div className="mt-6 grid gap-4">
          {/* Entity type */}

          <label className="grid gap-2 text-sm text-slate-600">
            Entity type
            <Input
              value={
                selectedEntity?.data?.entityType ||
                selectedEntity?.type ||
                "edge"
              }
              readOnly
            />
          </label>

          {/* Label */}

          <label className="grid gap-2 text-sm text-slate-600">
            Label / title
            <Input
              value={draft.label || draft.title || ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,

                  label: event.target.value,

                  title: event.target.value,
                }))
              }
            />
          </label>

          {/* Risk / confidence */}

          <label className="grid gap-2 text-sm text-slate-600">
            Risk / confidence
            <Input
              type="number"
              value={draft.confidence ?? draft.riskScore ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,

                  confidence: Number(event.target.value),

                  riskScore: Number(event.target.value),
                }))
              }
            />
          </label>

          {/* Notes */}

          <label className="grid gap-2 text-sm text-slate-600">
            Verified notes
            <Textarea
              value={
                draft.relationToCase ||
                draft.relationshipSource ||
                draft.notes ||
                ""
              }
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,

                  relationToCase: event.target.value,

                  relationshipSource: event.target.value,

                  notes: event.target.value,
                }))
              }
            />
          </label>

          <Button onClick={saveSelected}>
            <Save size={16} />
            Save verified edit
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
