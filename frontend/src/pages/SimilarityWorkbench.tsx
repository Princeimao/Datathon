import { useState } from "react";
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
} from "lucide-react";

import { api } from "../services/api";
import { Badge, Button, Card } from "../components/customUi";

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
    id: "image",
    title: "Face Image",
    description: "Face similarity search",
    icon: ScanFace,
  },
];

export default function SimilarityWorkbench() {
  const [searchType, setSearchType] = useState("statement");
  const [query, setQuery] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSearch() {
    try {
      setLoading(true);

      let payload;

      if (searchType === "image") {
        if (!image) {
          alert("Select an image first.");
          return;
        }

        // Upload image directly to Stratus
        const objectKey = await uploadImage(image);
        console.log(objectKey);

        payload = {
          type: "image",
          objectKey,
        };
      } else {
        payload = {
          type: searchType,
          value: query,
        };
      }

      const response = await api.searchSimilarity(payload);
      console.log(response);
      setResult(response);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file: File) {
    // 1. Ask backend for signed URL
    const res = await api.getSignedUrl({
      fileName: file.name,
      contentType: file.type,
    });

    console.log(res);
    const { uploadUrl, objectKey } = res as any;

    // 2. Upload directly to Stratus
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    console.log(uploadResponse);

    if (!uploadResponse.ok) {
      throw new Error("Image upload failed.");
    }

    return objectKey;
  }

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
                Search similar investigations using phone numbers, suspects,
                vehicle registrations, modus operandi, witness statements, or
                facial recognition.
              </p>
            </div>

            <FileSearch className="h-10 w-10 text-slate-400" />
          </div>

          {/* SEARCH TYPE */}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SEARCH_TYPES.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSearchType(item.id);
                    setQuery("");
                    setImage(null);
                  }}
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

          {/* INPUT */}

          <div className="mt-8">
            {searchType !== "image" ? (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Search Value
                </label>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Enter ${searchType}`}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                />
              </>
            ) : (
              <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 transition hover:border-emerald-500">
                {loading ? (
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-500" />
                ) : (
                  <UploadCloud className="mb-4 h-10 w-10 text-slate-500" />
                )}

                <strong className="text-lg text-slate-900">
                  {image ? image.name : "Upload Face Image"}
                </strong>

                <span className="mt-2 text-sm text-slate-500">
                  JPG, PNG or JPEG
                </span>

                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          <div className="mt-8">
            <Button
              onClick={handleSearch}
              disabled={
                loading ||
                (searchType === "image" ? !image : query.trim() === "")
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
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

        {/* SIDEBAR */}

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

            {searchType !== "image" && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Search Value
                </p>

                <Badge>{query || "Awaiting input"}</Badge>
              </div>
            )}

            {searchType === "image" && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Uploaded Image
                </p>

                <Badge>{image?.name || "No image selected"}</Badge>
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

          <Button className="mt-6 w-full">View Recent Searches</Button>
        </Card>
      </div>

      {/* RESULTS */}

      {result?.results?.database?.map((item: any) => (
        <Card key={item.id} className="overflow-hidden p-0">
          <div className="flex">
            <div className="flex w-32 items-center justify-center bg-emerald-600 text-center">
              <div>
                <p className="text-2xl font-bold text-white">Case</p>

                <p className="text-xs uppercase tracking-widest text-emerald-100">
                  Match
                </p>
              </div>
            </div>

            <div className="flex-1 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.caseNumber} • {item.crimeType}
                  </p>
                </div>

                <Badge>{item.status}</Badge>
              </div>

              <p className="mt-4 text-sm text-slate-600">{item.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {item.persons?.map((p: any) => (
                  <Badge key={p.personId}>{p.person.name}</Badge>
                ))}

                {item.vehicles?.map((v: any) => (
                  <Badge key={v.vehicleId}>{v.vehicle.registrationNo}</Badge>
                ))}

                {item.locations?.map((l: any) => (
                  <Badge key={l.locationId}>{l.location.address}</Badge>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button>View Investigation</Button>

                <Button>Link Cases</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
