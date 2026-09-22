import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import type { Supplier } from '../lib/supabase';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../lib/supabase';

const emptyDraft = (): Omit<Supplier, 'id' | 'created_at'> => ({
  name: '',
  category: '',
  location: '',
  price_range: '',
  price_level: '',
  phone: '',
  image_url: '',
  lat: null,
  lng: null,
  status: 'published',
  curated_by: null,
});

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchSuppliers();
    if (!error && data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setDraft({ ...s });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !draft.name.trim() || !draft.category.trim()) return;
    setSaving(true);
    if (editing) {
      const { error } = await updateSupplier(editing.id, draft, user.uid);
      if (error) setNotice(`Could not update: ${error.message}`);
      else setNotice(`Updated "${draft.name}".`);
    } else {
      const { error } = await createSupplier(draft, user.uid);
      if (error) setNotice(`Could not create: ${error.message}`);
      else setNotice(`Published "${draft.name}".`);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async (s: Supplier) => {
    if (!user) return;
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const { error } = await deleteSupplier(s.id, user.uid);
    if (error) setNotice(`Could not delete: ${error.message}`);
    else setNotice(`Deleted "${s.name}".`);
    load();
  };

  const toggleStatus = async (s: Supplier) => {
    if (!user) return;
    const nextStatus = s.status === 'published' ? 'hidden' : 'published';
    const { error } = await updateSupplier(s.id, { status: nextStatus }, user.uid);
    if (error) setNotice(`Could not change status: ${error.message}`);
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Supplier Directory</h1>
          <p className="text-sm text-inkSoft mt-0.5">
            Curate the suppliers shown in the app's Supplier Discovery tab (Objective 3).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand text-white font-semibold px-4 py-2 text-sm"
        >
          + Add Supplier
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg bg-brand/5 border border-brand/20 text-brand text-sm px-3 py-2">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-inkSoft">Loading suppliers…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-inkSoft">No suppliers yet. Add the first one.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-inkSoft uppercase bg-parchment">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-inkSoft">{s.category}</td>
                  <td className="px-4 py-3 text-inkSoft">{s.location}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(s)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        s.status === 'published'
                          ? 'bg-success/10 text-success'
                          : 'bg-inkSoft/10 text-inkSoft'
                      }`}
                    >
                      {s.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(s)} className="text-brand text-xs font-semibold">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-danger text-xs font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-ink mb-4">
              {editing ? 'Edit Supplier' : 'Add Supplier'}
            </h2>

            {(
              [
                ['name', 'Name'],
                ['category', 'Category'],
                ['location', 'Location'],
                ['price_range', 'Price Range (e.g. ₱₱)'],
                ['phone', 'Phone'],
                ['image_url', 'Image URL'],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="mb-3">
                <label className="block text-xs font-semibold text-inkSoft mb-1">{label}</label>
                <input
                  value={(draft[field] as string) ?? ''}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                  className="w-full rounded-lg border border-line bg-inputBg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </div>
            ))}

            <div className="flex items-center gap-2 mb-5">
              <input
                id="status"
                type="checkbox"
                checked={draft.status === 'published'}
                onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'published' : 'hidden' })}
              />
              <label htmlFor="status" className="text-sm text-ink">
                Published (visible in the app)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-line text-ink font-semibold py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim() || !draft.category.trim()}
                className="flex-1 rounded-lg bg-brand text-white font-semibold py-2.5 text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
