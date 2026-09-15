"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, Eye, EyeOff, Copy, Check, Lock, Loader2, Search } from "lucide-react";

type Employee = { id: string; first_name: string; last_name: string };

type Asset = {
  id: string;
  name: string;
  asset_type: string;
  assigned_employee_id: string | null;
  assigned_to_note: string | null;
  username: string | null;
  notes: string | null;
  created_at: string;
  hasSecret: boolean;
  hasPasscode: boolean;
  employees: { first_name: string; last_name: string } | null;
};

const ASSET_TYPES: { value: string; label: string }[] = [
  { value: "phone", label: "Phone" },
  { value: "laptop", label: "Laptop / Computer" },
  { value: "sim", label: "SIM Card" },
  { value: "portal", label: "Portal / Online Account" },
  { value: "wifi", label: "WiFi / Network" },
  { value: "other", label: "Other" },
];

function typeLabel(value: string) {
  return ASSET_TYPES.find((t) => t.value === value)?.label ?? "Other";
}

function assigneeLabel(asset: Asset) {
  if (asset.employees) return `${asset.employees.first_name} ${asset.employees.last_name}`.trim();
  if (asset.assigned_to_note) return asset.assigned_to_note;
  return "Unassigned";
}

function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function generatePasscode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => b % 10).join("");
}

export default function AssetsManager({ employees }: { employees: Employee[] }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/assets");
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createAsset(payload: Record<string, string>) {
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.error) { setAssets((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name))); setShowForm(false); }
    return data;
  }

  async function updateAsset(id: string, payload: Record<string, string>) {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.error) {
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditing(null);
    }
    return data;
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset and its stored password? This can't be undone.")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      assigneeLabel(a).toLowerCase().includes(q) ||
      (a.username ?? "").toLowerCase().includes(q) ||
      (a.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Lock size={20} /> Asset Passwords</h1>
          <p className="text-sm text-gray-500 mt-0.5">Device PINs, shared logins, and other credentials — visible to admins only. Passwords are encrypted at rest.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Add Asset
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets, people, notes..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-sm text-gray-400">
          {assets.length === 0 ? "No assets added yet." : "No assets match your search."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => (
            <AssetRow key={asset.id} asset={asset} onEdit={() => setEditing(asset)} onDelete={() => deleteAsset(asset.id)} />
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <AssetFormModal
          asset={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(payload) => (editing ? updateAsset(editing.id, payload) : createAsset(payload))}
        />
      )}
    </div>
  );
}

function RevealField({ assetId, field, label, has }: { assetId: string; field: "secret" | "passcode"; label: string; has: boolean }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleReveal() {
    if (revealed !== null) { setRevealed(null); return; }
    setRevealing(true);
    const res = await fetch(`/api/assets/${assetId}/reveal?field=${field}`);
    const data = await res.json();
    setRevealing(false);
    setRevealed(data.secret ?? "");
  }

  async function copy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!has) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      {revealed !== null && (
        <>
          <code className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono">{revealed || "(empty)"}</code>
          {revealed && (
            <button onClick={copy} title="Copy" className="text-gray-400 hover:text-gray-700">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          )}
        </>
      )}
      <button onClick={toggleReveal} disabled={revealing} className="text-gray-400 hover:text-gray-700" title={revealed !== null ? "Hide" : `Show ${label.toLowerCase()}`}>
        {revealing ? <Loader2 size={15} className="animate-spin" /> : revealed !== null ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function AssetRow({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  const isPhone = asset.asset_type === "phone";

  return (
    <div className="card flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{asset.name}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">{typeLabel(asset.asset_type)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {assigneeLabel(asset)}
          {asset.username && ` · ${asset.username}`}
        </p>
        {asset.notes && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{asset.notes}</p>}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {!asset.hasSecret && !asset.hasPasscode && <span className="text-xs text-gray-300">No password stored</span>}
        <RevealField assetId={asset.id} field="secret" label={isPhone ? "iCloud password" : "Password"} has={asset.hasSecret} />
        <RevealField assetId={asset.id} field="passcode" label="Passcode" has={asset.hasPasscode} />
        <button onClick={onEdit} className="text-gray-400 hover:text-gray-700"><Pencil size={15} /></button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function AssetFormModal({
  asset, employees, onClose, onSave,
}: {
  asset: Asset | null;
  employees: Employee[];
  onClose: () => void;
  onSave: (payload: Record<string, string>) => Promise<{ error?: string }>;
}) {
  const [name, setName] = useState(asset?.name ?? "");
  const [assetType, setAssetType] = useState(asset?.asset_type ?? "phone");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(asset?.assigned_employee_id ?? "");
  const [assignedToNote, setAssignedToNote] = useState(asset?.assigned_to_note ?? "");
  const [username, setUsername] = useState(asset?.username ?? "");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPhone = assetType === "phone";

  async function save() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    const result = await onSave({
      name,
      asset_type: assetType,
      assigned_employee_id: assignedEmployeeId,
      assigned_to_note: assignedToNote,
      username,
      secret,
      passcode,
      notes,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{asset ? "Edit Asset" : "Add Asset"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Asset name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone 14 — Ahmed" />
          </div>

          <div>
            <label className="label">Type</label>
            <select className="input" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Assigned to (employee)</label>
            <select className="input" value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)}>
              <option value="">— None —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Or describe who/what it's assigned to</label>
            <input className="input" value={assignedToNote} onChange={(e) => setAssignedToNote(e.target.value)} placeholder="e.g. Office reception, Sales team spare" />
          </div>

          <div>
            <label className="label">{isPhone ? "iCloud login details (optional)" : "Username / login (optional)"}</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={isPhone ? "Apple ID email" : "e.g. Apple ID, account email"} />
          </div>

          <div>
            <label className="label">
              {isPhone ? "iCloud password" : "Password / PIN"} {asset?.hasSecret && <span className="text-gray-400 font-normal">(leave blank to keep the current one)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showSecret ? "text" : "password"}
                className="input flex-1"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={asset?.hasSecret ? "••••••••" : ""}
              />
              <button type="button" onClick={() => setShowSecret((v) => !v)} className="btn-secondary px-3">
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button type="button" onClick={() => { setSecret(generatePassword()); setShowSecret(true); }} className="btn-secondary px-3 text-xs whitespace-nowrap">
                Generate
              </button>
            </div>
          </div>

          {isPhone && (
            <div className="border-t border-gray-100 pt-3">
              <label className="label">
                Phone passcode (lock screen) {asset?.hasPasscode && <span className="text-gray-400 font-normal">(leave blank to keep the current one)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type={showPasscode ? "text" : "password"}
                  inputMode="numeric"
                  className="input flex-1"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={asset?.hasPasscode ? "••••••" : "e.g. 231010"}
                />
                <button type="button" onClick={() => setShowPasscode((v) => !v)} className="btn-secondary px-3">
                  {showPasscode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button type="button" onClick={() => { setPasscode(generatePasscode()); setShowPasscode(true); }} className="btn-secondary px-3 text-xs whitespace-nowrap">
                  Generate
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else useful — recovery email, IMEI, etc." />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
