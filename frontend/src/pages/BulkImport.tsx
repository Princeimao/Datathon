import { useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { api } from "../services/api";
import { Badge, Button, Card } from "../components/customUi";

function detectFormat(fileName: string) {
  if (fileName.endsWith(".json")) return "json";
  if (fileName.endsWith(".csv")) return "csv";
  return "text";
}

export default function BulkImport() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    try {
      const content = await file.text();
      const format = detectFormat(file.name);
      const payload =
        format === "json"
          ? { format, fileName: file.name, records: JSON.parse(content) }
          : { format, fileName: file.name, content };
      setResult(await api.importBulk(payload));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Data Operations
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              Bulk crime record import
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Upload district exports, station reports, CSV files, JSON
              incidents, or free-text intelligence notes. The backend parses and
              queues graph analysis.
            </p>
          </div>
          <UploadCloud className="h-10 w-10 text-slate-400" />
        </div>

        <label className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 p-10 text-center transition hover:border-slate-500">
          {loading ? (
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-500" />
          ) : (
            <FileUp className="mb-4 h-10 w-10 text-slate-500" />
          )}
          <strong className="text-lg text-slate-950">
            Drop or select a file
          </strong>
          <span className="mt-2 max-w-md text-sm text-slate-500">
            Supports `.json`, `.csv`, and text notes. CSV headers can include
            district, policeStation, category, suspectName, vehicleRegistration,
            modusOperandi.
          </span>
          <input
            className="hidden"
            type="file"
            accept=".json,.csv,.txt"
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-950">Import result</h3>
        <div className="mt-4 grid gap-3">
          <Badge>{fileName || "No file selected"}</Badge>
          {result ? (
            <pre className="max-h-[440px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              The parsed import summary will appear here.
            </p>
          )}
        </div>
        <Button className="mt-5 w-full" disabled={!result}>
          Review queued intelligence jobs
        </Button>
      </Card>
    </div>
  );
}
