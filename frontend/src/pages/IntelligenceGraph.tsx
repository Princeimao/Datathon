import { useCallback, useMemo, useState } from "react";
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
import { getLayoutedElements } from "../lib/graphLib";
import { getForceLayout } from "../lib/forceLayout";

const redString = {
  type: "straight",
  animated: false,
  style: { stroke: "#be123c", strokeWidth: 3.5 },
  labelStyle: { fill: "#881337", fontWeight: 700, fontSize: 11 },
  labelBgStyle: { fill: "#fff7ed", fillOpacity: 0.92 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#be123c" },
};

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

export default function IntelligenceGraph({ filters = {} }: any) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [caseId, setCaseId] = useState("");
  const [personId, setPersonId] = useState("");
  const [freeQuery, setFreeQuery] = useState("");
  const [status, setStatus] = useState("Demo investigation loaded");
  const [loading, setLoading] = useState(false);

  const loadGraph = useCallback(async () => {
    if (!caseId && !personId && !freeQuery) {
      setNodes([]);
      setEdges([]);
      setStatus("Demo investigation loaded");
      return;
    }

    setLoading(true);
    setStatus("Loading scoped graph");
    try {
      const graph: any = await api.graph({
        ...(caseId ? { incidentId: caseId } : {}),
        ...(personId ? { personId } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        depth: 2,
        limit: 140,
      });

      const sourceNodes =
        graph.data.nodes && graph.data.nodes.length > 0
          ? graph.data.nodes
          : demoGraph.nodes;

      const sourceEdges =
        graph.data.edges && graph.data.edges.length > 0
          ? normalizeEdges(graph.data.edges)
          : normalizeEdges(demoGraph.edges);

      const layoutedGraph = getForceLayout(sourceNodes, sourceEdges);

      setNodes(layoutedGraph.nodes);
      setEdges(layoutedGraph.edges);

      setStatus(`${layoutedGraph.nodes.length} nodes loaded`);
    } catch (err: any) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseId, personId, freeQuery, filters]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((items) => applyNodeChanges(changes, items)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((items) => applyEdgeChanges(changes, items)),
    [],
  );
  const onConnect = useCallback(
    (params: any) =>
      setEdges((items) =>
        addEdge({ ...redString, ...params, label: "manual link" }, items),
      ),
    [],
  );

  const selectedEntity = useMemo(() => {
    if (!selected) return null;
    if (selected.source && selected.target)
      return { kind: "edge", ...selected };
    return { kind: "node", ...selected };
  }, [selected]);

  async function saveSelected() {
    if (!selectedEntity) return;
    const entityType = selectedEntity.data?.entityType;
    const recordId = selectedEntity.data?.recordId;
    setStatus("Saving verified correction");

    if (selectedEntity.kind === "edge" && entityType === "relationship")
      await api.updateRelationship(recordId, draft);
    if (entityType === "person") await api.updatePerson(recordId, draft);
    if (entityType === "incident") await api.updateIncident(recordId, draft);
    if (entityType === "location") await api.updateLocation(recordId, draft);

    setStatus("Saved");
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-52"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="Case / incident ID"
          />
          <Input
            className="w-52"
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
            placeholder="Person ID"
          />
          <Input
            className="min-w-[280px] flex-1"
            value={freeQuery}
            onChange={(event) => setFreeQuery(event.target.value)}
            placeholder="What does police want to find?"
          />
          <Button onClick={loadGraph} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}{" "}
            Open universe
          </Button>
          <GhostButton
            onClick={() => {
              setNodes([]);
              setEdges(normalizeEdges([]));
              setStatus("Demo investigation loaded");
            }}
          >
            <RefreshCw size={16} /> Demo graph
          </GhostButton>
          <Badge>{status}</Badge>
        </div>
      </Card>

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
            <Save size={16} /> Save verified edit
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
