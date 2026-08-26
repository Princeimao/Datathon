import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSearch,
  Search,
  UploadCloud,
  Loader2,
  Phone,
  User,
  Car,
  FileText,
  ScanFace,
  Fingerprint,
  Link2,
  MapPinned,
  Shield,
  GitBranch,
  X,
  Image as ImageIcon,
  ClipboardList,
  CalendarDays,
  Building2,
  Users,
  ScrollText,
} from "lucide-react";

import { api } from "../services/api";
import { Badge, Button, Card, GhostButton, Input, Select, Sheet } from "../components/customUi";
import { uploadFileToStorage, resolveObjectUrl } from "../lib/media";
import { cn } from "../lib/utils";

const SEARCH_TYPES = [
  {
    id: "statement",
    title: "Statement",
    description: "Search from FIR or witness statement",
    icon: FileText,
  },
  {
    id: "phone",
    title: "Phone Number",
    description: "Find linked mobile numbers",
    icon: Phone,
  },
  {
    id: "person",
    title: "Person",
    description: "Search suspect or witness",
    icon: User,
  },
  {
    id: "vehicle",
    title: "Vehicle",
    description: "Vehicle registration search",
    icon: Car,
  },
  {
    id: "mo",
    title: "Modus Operandi",
    description: "Similar crime pattern",
    icon: Fingerprint,
  },
  {
    id: "evidence",
    title: "Evidence",
    description: "Find linked evidence / media",
    icon: Link2,
  },
  {
    id: "image",
    title: "Image Search",
    description: "Visual & semantic image similarity",
    icon: ScanFace,
  },
];

const COMBINE_TYPES = SEARCH_TYPES.filter((item) => item.id !== "image");

function crimeType(caseItem: any) {
  return (
    caseItem.crimeMinorHead?.crimeHeadName ||
    caseItem.crimeMajorHead?.crimeGroupName ||
    caseItem.crimeType ||
    "Unknown"
  );
}

function caseStatus(caseItem: any) {
  return caseItem.caseStatus?.caseStatusName || caseItem.status || "Unknown";
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EvidenceThumb({ evidence }: { evidence: any }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const mime = (evidence.mimeType || "").toLowerCase();

    if (mime.startsWith("image/")) {
      resolveObjectUrl(evidence.extractedData?.storageKey).then((resolved) => {
        if (active) setUrl(resolved);
      });
    }

    return () => {
      active = false;
    };
  }, [evidence.fileUrl, evidence.extractedData?.storageKey, evidence.mimeType]);

  const mime = (evidence.mimeType || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const category = evidence.aiClassification?.category || evidence.extractedData?.category;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {isImage && url ? (
        <img src={url} alt={evidence.title || "Evidence"} className="h-28 w-full object-cover" />
      ) : (
        <div className="grid h-28 place-items-center text-slate-400">
          {mime.startsWith("video/") ? (
            <span className="text-xs font-medium">VIDEO</span>
          ) : (
            <ImageIcon size={28} />
          )}
        </div>
      )}
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-slate-800">
          {evidence.title || evidence.fileName || "Evidence"}
        </p>
        <Badge className="mt-1 border-slate-200 bg-slate-100 text-slate-600">
          {category || evidence.type}
        </Badge>
      </div>
    </div>
  );
}

function CaseCard({
  caseItem,
  onOpen,
}: {
  caseItem: any;
  onOpen: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex">
        <div className="flex w-32 shrink-0 items-center justify-center bg-emerald-600 text-center">
          <div>
            <p className="text-2xl font-bold text-white">Case</p>
            <p className="text-xs uppercase tracking-widest text-emerald-100">
              Match
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  {caseItem.title}
                </h3>
                {caseItem._matchedBy && (
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                    {caseItem._matchedBy.replaceAll("_", " ")}
                  </Badge>
                )}
                {caseItem._score != null && caseItem._score > 0 && (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    {Math.round(caseItem._score * 100)}% similar
                  </Badge>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {caseItem.caseNumber} • {crimeType(caseItem)} •{" "}
                {caseStatus(caseItem)} • {formatDate(caseItem.incidentFromDate || caseItem.crimeRegisteredDate)}
              </p>
            </div>
          </div>

          {caseItem.description && (
            <p className="mt-4 line-clamp-3 text-sm text-slate-600">
              {caseItem.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {caseItem.persons?.slice(0, 6).map((p: any) => (
              <Badge key={p.personId}>
                <User size={12} className="mr-1" />
                {p.person.name || "Unknown"} · {p.role}
              </Badge>
            ))}

            {caseItem.phones?.slice(0, 4).map((ph: any) => (
              <Badge key={ph.phoneId}>
                <Phone size={12} className="mr-1" />
                {ph.phone.number}
              </Badge>
            ))}

            {caseItem.vehicles?.slice(0, 4).map((v: any) => (
              <Badge key={v.vehicleId}>
                <Car size={12} className="mr-1" />
                {v.vehicle.registrationNo || "Vehicle"}
              </Badge>
            ))}

            {caseItem.locations?.slice(0, 4).map((l: any) => (
              <Badge key={l.locationId}>
                <MapPinned size={12} className="mr-1" />
                {l.location.address || "Location"}
              </Badge>
            ))}

            {caseItem.evidences?.length > 0 && (
              <Badge>
                <Link2 size={12} className="mr-1" />
                {caseItem.evidences.length} evidence
              </Badge>
            )}
          </div>

          {caseItem._evidenceMatches?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {caseItem._evidenceMatches.slice(0, 4).map((match: any) => (
                <Badge key={match.evidenceId} className="border-sky-200 bg-sky-50 text-sky-700">
                  Evidence {Math.round(match.score * 100)}%
                </Badge>
              ))}
            </div>
          )}

          {caseItem._faceMatches?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {caseItem._faceMatches.slice(0, 5).map((match: any, index: number) => (
                <Badge
                  key={`${match.personId}-${index}`}
                  className="border-indigo-200 bg-indigo-50 text-indigo-700"
                >
                  <User size={12} className="mr-1" />
                  {match.personName || "Person"} ·{" "}
                  {Math.round((match.probability || 0) * 100)}% face match
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={() => onOpen(caseItem.id)}>
              <Shield size={16} className="mr-1" /> View Investigation
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Section({ title, icon: Icon, children }: any) {
  if (!children) return null;

  return (
    <div className="mt-6">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={14} />}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InvestigationView({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);

    api
      .investigation(caseId)
      .then((res: any) => {
        if (active) setData(res?.case || null);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Unable to load investigation");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [caseId]);

  const c = data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Investigation</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {c?.title || "Loading…"}
          </h3>
          {c && (
            <p className="mt-1 text-sm text-slate-500">
              {c.caseNumber} • {crimeType(c)} • {caseStatus(c)}
            </p>
          )}
        </div>
        <GhostButton onClick={onClose}>
          <X size={18} />
        </GhostButton>
      </div>

      {loading && (
        <div className="mt-20 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading investigation…</span>
        </div>
      )}

      {error && (
        <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && c && (
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {crimeType(c)}
            </Badge>
            <Badge>{caseStatus(c)}</Badge>
            <Badge>
              <CalendarDays size={12} className="mr-1" />
              {formatDate(c.incidentFromDate || c.crimeRegisteredDate)}
            </Badge>
            {c.policeUnit?.unitName && (
              <Badge>
                <Building2 size={12} className="mr-1" />
                {c.policeUnit.unitName}
              </Badge>
            )}
          </div>

          {c.description && (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {c.description}
            </p>
          )}

          <Section title={`People (${c.persons?.length || 0})`} icon={Users}>
            <div className="mt-2 grid gap-3">
              {c.persons?.map((cp: any) => {
                const p = cp.person;
                return (
                  <div key={cp.personId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-slate-900">
                        {p.name || "Unknown Person"}
                      </strong>
                      <Badge className={cn(cp.role === "SUSPECT" && "border-red-200 bg-red-50 text-red-700")}>
                        {cp.role}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[p.age ? `Age ${p.age}` : null, p.gender !== "UNKNOWN" ? p.gender : null]
                        .filter(Boolean)
                        .join(" · ") || "No profile details"}
                      {p.aliases?.length > 0 && ` · Aliases: ${p.aliases.join(", ")}`}
                    </p>
                    {cp.notes && <p className="mt-2 text-xs text-slate-600">{cp.notes}</p>}

                    {(p.phones?.length > 0 || p.vehicles?.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.phones?.map((owner: any) => (
                          <Badge key={owner.phoneId}>
                            <Phone size={12} className="mr-1" />
                            {owner.phone.number}
                          </Badge>
                        ))}
                        {p.vehicles?.map((owner: any) => (
                          <Badge key={owner.vehicleId}>
                            <Car size={12} className="mr-1" />
                            {owner.vehicle.registrationNo || "Vehicle"}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {c.phones?.length > 0 && (
            <Section title={`Phone numbers (${c.phones.length})`} icon={Phone}>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.phones.map((cp: any) => (
                  <Badge key={cp.phoneId}>{cp.phone.number}</Badge>
                ))}
              </div>
            </Section>
          )}

          {c.vehicles?.length > 0 && (
            <Section title={`Vehicles (${c.vehicles.length})`} icon={Car}>
              <div className="mt-2 grid gap-2">
                {c.vehicles.map((cv: any) => (
                  <div key={cv.vehicleId} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                    <strong>{cv.vehicle.registrationNo || "Vehicle"}</strong>
                    <span className="text-slate-500">
                      {[cv.vehicle.color, cv.vehicle.make, cv.vehicle.model]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {c.locations?.length > 0 && (
            <Section title={`Locations (${c.locations.length})`} icon={MapPinned}>
              <div className="mt-2 grid gap-2">
                {c.locations.map((cl: any) => (
                  <div key={cl.locationId} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                    <strong>{cl.location.address || "Location"}</strong>
                    <span className="text-slate-500">
                      {" "}
                      • {cl.locationType || cl.location.locationType || "related"}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {c.evidences?.length > 0 && (
            <Section title={`Evidence & media (${c.evidences.length})`} icon={ClipboardList}>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {c.evidences.map((evidence: any) => (
                  <EvidenceThumb key={evidence.id} evidence={evidence} />
                ))}
              </div>
            </Section>
          )}

          {c.modusOperandi && (
            <Section title="Modus operandi" icon={Fingerprint}>
              <div className="mt-2 rounded-2xl border border-slate-200 p-4 text-sm">
                <strong>{c.modusOperandi.name}</strong>
                <p className="mt-1 text-slate-600">{c.modusOperandi.description}</p>
                {(c.modusOperandi.weaponType || c.modusOperandi.timePattern) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {[c.modusOperandi.weaponType && `Weapon: ${c.modusOperandi.weaponType}`, c.modusOperandi.timePattern && `Time: ${c.modusOperandi.timePattern}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </Section>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => {
                navigate(`/graph?caseId=${caseId}`);
              }}
            >
              <GitBranch size={16} className="mr-1" /> Open in Case Board
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimilarityWorkbench() {
  const [searchType, setSearchType] = useState("statement");
  const [query, setQuery] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [combine, setCombine] = useState(false);
  const [combineType, setCombineType] = useState("statement");
  const [combineValue, setCombineValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeCase, setActiveCase] = useState<string | null>(null);

  const imageMode = searchType === "image";

  const canSearch = useMemo(() => {
    if (imageMode) return Boolean(image);
    return query.trim() !== "";
  }, [imageMode, image, query]);

  function selectType(id: string) {
    setSearchType(id);
    setQuery("");
    setImage(null);
    setImagePreview(null);
    setResult(null);
  }

  function onImageChange(file?: File) {
    setImage(file || null);
    setResult(null);

    if (file) {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    } else {
      setImagePreview(null);
    }
  }

  async function handleSearch() {
    try {
      setLoading(true);
      setResult(null);

      const payload: any = {};

      if (imageMode) {
        if (!image) {
          alert("Select an image first.");
          return;
        }

        const keyPrefix = "similarity-search";

        const { objectKey, fileHash } = await uploadFileToStorage(image, keyPrefix);

        payload.type = "image";
        payload.objectKey = objectKey;
        payload.imageHash = fileHash;

        if (combine && combineValue.trim()) {
          payload.value = combineValue.trim();
          payload.combinedType = combineType;
        }
      } else {
        payload.type = searchType;
        payload.value = query.trim();
      }

      const response = await api.searchSimilarity(payload);
      setResult(response);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const dbResults = result?.results?.database || [];
  const imageResults = result?.results?.image || [];
  const relatedResults = result?.results?.related || [];

  const seenCaseIds = new Set<string>();
  const allResults = [...dbResults, ...imageResults, ...relatedResults].filter((item) => {
    if (seenCaseIds.has(item.id)) return false;
    seenCaseIds.add(item.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Investigation Intelligence
              </p>

              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                Crime Similarity Search
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Upload an image or search structured fields. Similar cases are
                matched visually and semantically, then combined with people,
                statements, phone numbers, vehicles and evidence.
              </p>
            </div>

            <FileSearch className="h-10 w-10 text-slate-400" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SEARCH_TYPES.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => selectType(item.id)}
                  className={`rounded-3xl border p-5 text-left transition-all ${
                    searchType === item.id
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`mb-4 h-8 w-8 ${
                      searchType === item.id
                        ? "text-emerald-600"
                        : "text-slate-500"
                    }`}
                  />

                  <h4 className="font-semibold text-slate-900">{item.title}</h4>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            {!imageMode ? (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Search Value
                </label>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={`Enter ${searchType}`}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                />
              </>
            ) : (
              <div className="space-y-5">
                <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 transition hover:border-emerald-500">
                  {loading ? (
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-500" />
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Uploaded"
                      className="h-40 w-40 rounded-2xl object-cover shadow-md"
                    />
                  ) : (
                    <UploadCloud className="mb-4 h-10 w-10 text-slate-500" />
                  )}

                  <strong className="text-lg text-slate-900">
                    {image ? image.name : "Upload image to search"}
                  </strong>

                  <span className="mt-2 text-sm text-slate-500">
                    JPG, PNG or JPEG — visual & semantic matching
                  </span>

                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageChange(e.target.files?.[0] || undefined)}
                  />
                </label>

                {image && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={combine}
                        onChange={(e) => setCombine(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      Combine with structured fields
                    </label>

                    {combine && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
                        <Select value={combineType} onChange={(e) => setCombineType(e.target.value)}>
                          {COMBINE_TYPES.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </Select>
                        <Input
                          value={combineValue}
                          onChange={(e) => setCombineValue(e.target.value)}
                          placeholder={`Also search by ${combineType}…`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <Button onClick={handleSearch} disabled={loading || !canSearch}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Similar Cases
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Search Summary
          </h3>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Search Type
              </p>
              <Badge>{searchType}</Badge>
            </div>

            {!imageMode && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Search Value
                </p>
                <Badge>{query || "Awaiting input"}</Badge>
              </div>
            )}

            {imageMode && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Uploaded Image
                </p>
                <Badge>{image?.name || "No image selected"}</Badge>
              </div>
            )}

            {imageMode && combine && combineValue.trim() && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Combined Field
                </p>
                <Badge>
                  {combineType}: {combineValue}
                </Badge>
              </div>
            )}

            {result && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Matches
                </p>
                <Badge>{allResults.length} cases</Badge>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Search Scope
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge>FIR</Badge>
                <Badge>Criminal</Badge>
                <Badge>Vehicle</Badge>
                <Badge>CDR</Badge>
                <Badge>Evidence</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {result && (
        <div className="space-y-4">
          {allResults.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-lg font-semibold text-slate-700">
                No matching cases found
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Try a different image, name, phone number or statement.
              </p>
            </Card>
          )}

          {allResults.map((item: any) => (
            <CaseCard key={item.id} caseItem={item} onOpen={setActiveCase} />
          ))}
        </div>
      )}

      <Sheet open={Boolean(activeCase)} onClose={() => setActiveCase(null)}>
        {activeCase && (
          <InvestigationView caseId={activeCase} onClose={() => setActiveCase(null)} />
        )}
      </Sheet>
    </div>
  );
}
