import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpenText,
  Building2,
  Car,
  FileUp,
  GitBranch,
  Loader2,
  MapPinned,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { api } from "../services/api";
import { Badge, Button, Card, GhostButton, Input, Select, Textarea } from "../components/customUi";
import { uploadFileToStorage } from "../lib/media";

const CRIME_TYPES = [
  "HOMICIDE",
  "ROBBERY",
  "ASSAULT",
  "THEFT",
  "BURGLARY",
  "KIDNAPPING",
  "FRAUD",
  "CYBERCRIME",
  "DRUG_OFFENSE",
  "RAPE",
  "MURDER",
  "OTHER",
];

const CASE_STATUSES = ["OPEN", "CLOSED", "COLD"];

const PERSON_ROLES = [
  "SUSPECT",
  "ACCUSED",
  "VICTIM",
  "COMPLAINANT",
  "WITNESS",
  "INFORMANT",
  "UNKNOWN",
];

const GENDERS = ["MALE", "FEMALE", "OTHER", "UNKNOWN"];

const LOCATION_TYPES = [
  "CRIME_SCENE",
  "RELATED_PLACE",
  "REPORTING_STATION",
  "ARREST_LOCATION",
  "RESIDENCE",
  "WORKPLACE",
  "COURT",
  "HOSPITAL",
  "OTHER",
  "UNKNOWN",
];

const MEDIA_CATEGORIES = [
  { id: "evidence", label: "Evidence" },
  { id: "suspect", label: "Suspect" },
  { id: "weapon", label: "Weapon" },
  { id: "victim", label: "Victim" },
  { id: "location", label: "Location" },
  { id: "document", label: "Document" },
  { id: "other", label: "Other" },
];

const emptyPerson = {
  name: "",
  role: "SUSPECT",
  age: "",
  gender: "UNKNOWN",
  aliases: "",
  notes: "",
};

const emptyPhone = { number: "", countryCode: "+91", context: "" };
const emptyVehicle = { registrationNumber: "", make: "", model: "", color: "", type: "" };
const emptyLocation = { address: "", district: "", station: "", locationType: "CRIME_SCENE", description: "" };
const emptyOrganization = { name: "", description: "", organizationType: "" };

type MediaItem = {
  objectKey: string;
  fileName: string;
  contentType: string;
  category: string;
  label: string;
  description: string;
  personName: string;
  fileHash: string;
  uploading: boolean;
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function StructuredInsert() {
  const navigate = useNavigate();

  const [caseFields, setCaseFields] = useState({
    title: "",
    caseNumber: "",
    crimeType: "OTHER",
    caseStatus: "OPEN",
    incidentDate: "",
    location: "",
    description: "",
  });

  const [persons, setPersons] = useState<any[]>([{ ...emptyPerson }]);
  const [phones, setPhones] = useState<any[]>([{ ...emptyPhone }]);
  const [vehicles, setVehicles] = useState<any[]>([{ ...emptyVehicle }]);
  const [locations, setLocations] = useState<any[]>([{ ...emptyLocation }]);
  const [organizations, setOrganizations] = useState<any[]>([{ ...emptyOrganization }]);

  const [moEnabled, setMoEnabled] = useState(false);
  const [mo, setMo] = useState({ name: "", description: "", weaponType: "", timePattern: "" });

  const [statement, setStatement] = useState("");

  const [media, setMedia] = useState<MediaItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function updateList<T>(setter: (updater: (list: T[]) => T[]) => void, index: number, patch: Partial<T>) {
    setter((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function setCaseField(field: string, value: string) {
    setCaseFields((current) => ({ ...current, [field]: value }));
  }

  async function addMediaFile(file?: File) {
    if (!file) return;

    const item: MediaItem = {
      objectKey: "",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      category: "evidence",
      label: "",
      description: "",
      personName: "",
      fileHash: "",
      uploading: true,
    };

    setMedia((list) => [...list, item]);
    setError(null);

    try {
      const category = "evidence";

      const { objectKey, fileHash } = await uploadFileToStorage(file, `evidence/${category}`);

      setMedia((list) =>
        list.map((entry, index) =>
          entry.fileName === file.name && entry.uploading
            ? { ...entry, objectKey, fileHash, uploading: false }
            : entry,
        ),
      );
    } catch (err: any) {
      console.error(err);
      setError(`Upload failed for ${file.name}: ${err.message}`);
      setMedia((list) => list.map((entry, index) => (entry.fileName === file.name ? { ...entry, uploading: false } : entry)));
    }
  }

  function updateMedia(index: number, patch: Partial<MediaItem>) {
    setMedia((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeMedia(index: number) {
    setMedia((list) => list.filter((_, i) => i !== index));
  }

  function setMoField(field: string, value: string) {
    setMo((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError(null);

      const cleanPersons = persons
        .filter((person) => person.name.trim())
        .map((person) => ({
          name: person.name.trim(),
          role: person.role,
          age: person.age ? Number(person.age) : null,
          gender: person.gender,
          aliases: person.aliases
            ? person.aliases.split(",").map((item: string) => item.trim()).filter(Boolean)
            : [],
          notes: person.notes.trim() || null,
          confidence: 1,
        }));

      const cleanPhones = phones
        .filter((phone) => phone.number.trim())
        .map((phone) => ({
          number: phone.number.trim(),
          countryCode: phone.countryCode?.trim() || null,
          context: phone.context?.trim() || null,
          confidence: 1,
        }));

      const cleanVehicles = vehicles
        .filter((vehicle) => vehicle.registrationNumber.trim())
        .map((vehicle) => ({
          registrationNumber: vehicle.registrationNumber.trim().toUpperCase(),
          make: vehicle.make.trim() || null,
          model: vehicle.model.trim() || null,
          color: vehicle.color.trim() || null,
          type: vehicle.type.trim() || null,
          confidence: 1,
        }));

      const cleanLocations = locations
        .filter((location) => location.address.trim())
        .map((location) => ({
          name: null,
          address: location.address.trim(),
          district: location.district.trim() || null,
          station: location.station.trim() || null,
          locationType: location.locationType,
          description: location.description.trim() || null,
          confidence: 1,
        }));

      const cleanOrganizations = organizations
        .filter((organization) => organization.name.trim())
        .map((organization) => ({
          name: organization.name.trim(),
          description: organization.description.trim() || null,
          organizationType: organization.organizationType.trim() || null,
          confidence: 1,
        }));

      const readyMedia = media
        .filter((item) => item.objectKey && !item.uploading)
        .map((item) => ({
          objectKey: item.objectKey,
          fileName: item.fileName,
          contentType: item.contentType,
          category: item.category,
          label: item.label.trim() || item.fileName,
          description: item.description.trim() || null,
          personName: item.personName.trim() || null,
          fileHash: item.fileHash,
        }));

      const payload = {
        case: {
          title: caseFields.title.trim(),
          caseNumber: caseFields.caseNumber.trim() || null,
          crimeType: caseFields.crimeType,
          caseStatus: caseFields.caseStatus,
          incidentDate: caseFields.incidentDate || null,
          location: caseFields.location.trim() || null,
          description: caseFields.description.trim() || null,
        },
        persons: cleanPersons,
        phones: cleanPhones,
        vehicles: cleanVehicles,
        locations: cleanLocations,
        organizations: cleanOrganizations,
        modusOperandi: moEnabled
          ? {
              name: mo.name.trim() || "Manual MO",
              description: mo.description.trim(),
              weaponType: mo.weaponType.trim() || null,
              timePattern: mo.timePattern.trim() || null,
            }
          : null,
        statement: statement.trim() || null,
        media: readyMedia,
        relationships: [],
      };

      const res: any = await api.structuredIngest(payload);
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to create case");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Data Entry</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              Structured case & person insertion
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manually enter case, person, phone, vehicle, location and evidence
              details. Images and videos are uploaded to storage and tagged by
              category (evidence, suspect, weapon, victim, location, document,
              other).
            </p>
          </div>
          <BookOpenText className="h-10 w-10 text-slate-400" />
        </div>
      </Card>

      <SectionCard title="Case details" subtitle="Core case information" icon={ShieldCheck}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-600">
            Title
            <Input
              value={caseFields.title}
              onChange={(e) => setCaseField("title", e.target.value)}
              placeholder="Case title"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Case / FIR number
            <Input
              value={caseFields.caseNumber}
              onChange={(e) => setCaseField("caseNumber", e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Crime type
            <Select value={caseFields.crimeType} onChange={(e) => setCaseField("crimeType", e.target.value)}>
              {CRIME_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Status
            <Select value={caseFields.caseStatus} onChange={(e) => setCaseField("caseStatus", e.target.value)}>
              {CASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Incident date
            <Input
              type="date"
              value={caseFields.incidentDate}
              onChange={(e) => setCaseField("incidentDate", e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Location
            <Input
              value={caseFields.location}
              onChange={(e) => setCaseField("location", e.target.value)}
              placeholder="District / place"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-600 md:col-span-2 lg:col-span-3">
            Description
            <Textarea
              value={caseFields.description}
              onChange={(e) => setCaseField("description", e.target.value)}
              placeholder="Summary of the incident…"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="People" subtitle="Suspects, victims, witnesses and others" icon={UserRound}>
        <div className="space-y-4">
          {persons.map((person, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1.5 text-sm text-slate-600">
                  Name
                  <Input
                    value={person.name}
                    onChange={(e) => updateList(setPersons, index, { name: e.target.value })}
                    placeholder="Person name"
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-slate-600">
                  Role
                  <Select value={person.role} onChange={(e) => updateList(setPersons, index, { role: e.target.value })}>
                    {PERSON_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm text-slate-600">
                  Age
                  <Input
                    type="number"
                    value={person.age}
                    onChange={(e) => updateList(setPersons, index, { age: e.target.value })}
                    placeholder="Age"
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-slate-600">
                  Gender
                  <Select value={person.gender} onChange={(e) => updateList(setPersons, index, { gender: e.target.value })}>
                    {GENDERS.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm text-slate-600 md:col-span-2">
                  Aliases (comma separated)
                  <Input
                    value={person.aliases}
                    onChange={(e) => updateList(setPersons, index, { aliases: e.target.value })}
                    placeholder="aka…"
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-slate-600 md:col-span-2">
                  Notes / statement
                  <Input
                    value={person.notes}
                    onChange={(e) => updateList(setPersons, index, { notes: e.target.value })}
                    placeholder="Role notes"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <GhostButton
                  onClick={() => setPersons((list) => list.filter((_, i) => i !== index))}
                  disabled={persons.length === 1}
                >
                  <Trash2 size={14} /> Remove
                </GhostButton>
              </div>
            </div>
          ))}

          <GhostButton
            onClick={() => setPersons((list) => [...list, { ...emptyPerson }])}
          >
            <Plus size={16} /> Add person
          </GhostButton>
        </div>
      </SectionCard>

      <SectionCard title="Phones" subtitle="Numbers linked to the case" icon={ShieldCheck}>
        <div className="space-y-3">
          {phones.map((phone, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[140px_1fr_1fr_auto]">
              <Input
                value={phone.countryCode}
                onChange={(e) => updateList(setPhones, index, { countryCode: e.target.value })}
                placeholder="+91"
              />
              <Input
                value={phone.number}
                onChange={(e) => updateList(setPhones, index, { number: e.target.value })}
                placeholder="Phone number"
              />
              <Input
                value={phone.context}
                onChange={(e) => updateList(setPhones, index, { context: e.target.value })}
                placeholder="Context"
              />
              <GhostButton
                onClick={() => setPhones((list) => list.filter((_, i) => i !== index))}
                disabled={phones.length === 1}
              >
                <Trash2 size={14} />
              </GhostButton>
            </div>
          ))}
          <GhostButton onClick={() => setPhones((list) => [...list, { ...emptyPhone }])}>
            <Plus size={16} /> Add phone
          </GhostButton>
        </div>
      </SectionCard>

      <SectionCard title="Vehicles" subtitle="Vehicles spotted or owned" icon={Car}>
        <div className="space-y-3">
          {vehicles.map((vehicle, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5">
              <Input
                value={vehicle.registrationNumber}
                onChange={(e) => updateList(setVehicles, index, { registrationNumber: e.target.value })}
                placeholder="Registration no"
                className="md:col-span-2"
              />
              <Input
                value={vehicle.make}
                onChange={(e) => updateList(setVehicles, index, { make: e.target.value })}
                placeholder="Make"
              />
              <Input
                value={vehicle.model}
                onChange={(e) => updateList(setVehicles, index, { model: e.target.value })}
                placeholder="Model"
              />
              <div className="flex gap-2">
                <Input
                  value={vehicle.color}
                  onChange={(e) => updateList(setVehicles, index, { color: e.target.value })}
                  placeholder="Color"
                />
                <GhostButton
                  onClick={() => setVehicles((list) => list.filter((_, i) => i !== index))}
                  disabled={vehicles.length === 1}
                >
                  <Trash2 size={14} />
                </GhostButton>
              </div>
            </div>
          ))}
          <GhostButton onClick={() => setVehicles((list) => [...list, { ...emptyVehicle }])}>
            <Plus size={16} /> Add vehicle
          </GhostButton>
        </div>
      </SectionCard>

      <SectionCard title="Locations" subtitle="Crime scenes and related places" icon={MapPinned}>
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
              <Input
                value={location.address}
                onChange={(e) => updateList(setLocations, index, { address: e.target.value })}
                placeholder="Address"
                className="md:col-span-2"
              />
              <Input
                value={location.district}
                onChange={(e) => updateList(setLocations, index, { district: e.target.value })}
                placeholder="District"
              />
              <Input
                value={location.station}
                onChange={(e) => updateList(setLocations, index, { station: e.target.value })}
                placeholder="Station"
              />
              <Select
                value={location.locationType}
                onChange={(e) => updateList(setLocations, index, { locationType: e.target.value })}
                className="md:col-span-2"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2 md:col-span-2">
                <Input
                  value={location.description}
                  onChange={(e) => updateList(setLocations, index, { description: e.target.value })}
                  placeholder="Description"
                />
                <GhostButton
                  onClick={() => setLocations((list) => list.filter((_, i) => i !== index))}
                  disabled={locations.length === 1}
                >
                  <Trash2 size={14} />
                </GhostButton>
              </div>
            </div>
          ))}
          <GhostButton onClick={() => setLocations((list) => [...list, { ...emptyLocation }])}>
            <Plus size={16} /> Add location
          </GhostButton>
        </div>
      </SectionCard>

      <SectionCard title="Organizations" subtitle="Groups and entities involved" icon={Building2}>
        <div className="space-y-3">
          {organizations.map((organization, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
              <Input
                value={organization.name}
                onChange={(e) => updateList(setOrganizations, index, { name: e.target.value })}
                placeholder="Organization name"
              />
              <Input
                value={organization.organizationType}
                onChange={(e) => updateList(setOrganizations, index, { organizationType: e.target.value })}
                placeholder="Type"
              />
              <div className="flex gap-2">
                <Input
                  value={organization.description}
                  onChange={(e) => updateList(setOrganizations, index, { description: e.target.value })}
                  placeholder="Description"
                />
                <GhostButton
                  onClick={() => setOrganizations((list) => list.filter((_, i) => i !== index))}
                  disabled={organizations.length === 1}
                >
                  <Trash2 size={14} />
                </GhostButton>
              </div>
            </div>
          ))}
          <GhostButton onClick={() => setOrganizations((list) => [...list, { ...emptyOrganization }])}>
            <Plus size={16} /> Add organization
          </GhostButton>
        </div>
      </SectionCard>

      <SectionCard title="Modus operandi" subtitle="Optional crime pattern" icon={BookOpenText}>
        <div className="mb-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={moEnabled}
              onChange={(e) => setMoEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            Record modus operandi
          </label>
        </div>
        {moEnabled && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-600">
              Name
              <Input value={mo.name} onChange={(e) => setMoField("name", e.target.value)} placeholder="MO name" />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Weapon type
              <Input value={mo.weaponType} onChange={(e) => setMoField("weaponType", e.target.value)} placeholder="Weapon" />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Time pattern
              <Input value={mo.timePattern} onChange={(e) => setMoField("timePattern", e.target.value)} placeholder="Time pattern" />
            </label>
            <label className="grid gap-2 text-sm text-slate-600 md:col-span-2">
              Description
              <Textarea value={mo.description} onChange={(e) => setMoField("description", e.target.value)} placeholder="MO description" />
            </label>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Statement" subtitle="Free-text FIR / witness statement" icon={BookOpenText}>
        <Textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Paste or type the statement text…"
        />
      </SectionCard>

      <SectionCard title="Media" subtitle="Images & videos with a category per file" icon={FileUp}>
        <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 transition hover:border-emerald-500">
          <FileUp className="mb-3 h-9 w-9 text-slate-500" />
          <strong className="text-sm text-slate-900">Add images or videos</strong>
          <span className="mt-1 text-xs text-slate-500">
            Each file is uploaded and tagged with a category
          </span>
          <input
            className="hidden"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => addMediaFile(e.target.files?.[0] || undefined)}
          />
        </label>

        {media.length > 0 && (
          <div className="mt-4 grid gap-3">
            {media.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <p className="mb-1 text-xs text-slate-500">File</p>
                  <Badge className="max-w-full truncate">
                    {item.uploading && <Loader2 size={12} className="mr-1 animate-spin" />}
                    {item.fileName}
                  </Badge>
                </div>
                <label className="grid gap-1 text-sm text-slate-600">
                  Category
                  <Select value={item.category} onChange={(e) => updateMedia(index, { category: e.target.value })}>
                    {MEDIA_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  Label
                  <Input
                    value={item.label}
                    onChange={(e) => updateMedia(index, { label: e.target.value })}
                    placeholder="Short label"
                  />
                </label>
                <div className="flex items-end">
                  <GhostButton onClick={() => removeMedia(index)}>
                    <Trash2 size={14} />
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>
      )}

      {result?.caseId && (
        <Card className="border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-emerald-900">Case created successfully</h3>
              <p className="mt-1 text-sm text-emerald-700">
                Case ID <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">{result.caseId}</Badge>
                {result.caseNumber && (
                  <>
                    {" "}
                    • Number <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">{result.caseNumber}</Badge>
                  </>
                )}
                {" "}• {result.personsCreated || 0} people • {result.evidenceCreated || 0} evidence records
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/graph?caseId=${result.caseId}`)}
              >
                <GitBranch size={16} className="mr-1" /> Open in Case Board
              </Button>
              <GhostButton onClick={() => navigate("/similarity")}>
                Search similar cases
              </GhostButton>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {persons.filter((person) => person.name.trim()).length} people,{" "}
            {phones.filter((phone) => phone.number.trim()).length} phones,{" "}
            {media.filter((item) => item.objectKey && !item.uploading).length} media files
          </p>
          <Button onClick={handleSubmit} disabled={submitting || !caseFields.title.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating case…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Create case record
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
