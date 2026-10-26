import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import type { Supplier } from '../lib/supabase';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../lib/supabase';
import {
  Plus,
  Search,
  MapPin,
  Store,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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

  // Client-side search and filters over existing data
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchSuppliers();
    if (!error && data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(suppliers.map((s) => s.category).filter(Boolean))
    );
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === 'all' || s.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, searchQuery, categoryFilter, statusFilter]);

  const SUPPLIERS_PAGE_SIZE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / SUPPLIERS_PAGE_SIZE));
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * SUPPLIERS_PAGE_SIZE;
    return filteredSuppliers.slice(start, start + SUPPLIERS_PAGE_SIZE);
  }, [filteredSuppliers, currentPage]);

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
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* Page Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1320]">
            Supplier Directory
          </h1>
          <p className="text-sm text-[#6E5D70] mt-1.5">
            Curate the suppliers shown in the app's Supplier Discovery tab.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#42143E] hover:bg-[#310E2E] active:scale-[0.99] text-white font-semibold rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(66,20,62,0.2)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Notice / Alert Banner */}
      {notice && (
        <div className="p-4 rounded-xl bg-[#FAF6FB] border border-[#E8DCEB] text-[#42143E] text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#42143E] shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button
            onClick={() => setNotice('')}
            className="text-xs font-semibold text-[#8C7A8E] hover:text-[#42143E] transition-colors ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center font-bold text-base mb-3 animate-pulse">
            <Store className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#1E1320]">Loading suppliers…</p>
          <p className="text-xs text-[#6E5D70] mt-1">Connecting to directory database</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1320]">No suppliers in directory</h3>
          <p className="text-sm text-[#6E5D70] mt-1 max-w-sm mx-auto">
            Add verified suppliers to recommend them to Philippine entrepreneurs in the mobile app.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 bg-[#42143E] hover:bg-[#310E2E] text-white font-semibold rounded-xl px-4 py-2 text-xs shadow-sm cursor-pointer"
          >
            + Add First Supplier
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)]">
          {/* Top Table Bar: Search & Filters */}
          <div className="p-4 border-b border-[#F1ECF2] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search suppliers by name, category, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] placeholder-[#8C7A8E] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E] cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#6E5D70] bg-[#FAF8FB] border-b border-[#EFEAEF]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFF5]">
                {paginatedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-2">
                        <Search className="w-5 h-5 text-[#8C7A8E]" />
                      </div>
                      <p className="text-sm font-semibold text-[#1E1320]">No suppliers match your filter</p>
                      <p className="text-xs text-[#6E5D70] mt-1">Try clearing search terms or category filters.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('all');
                          setStatusFilter('all');
                        }}
                        className="mt-3 text-xs font-semibold text-[#42143E] underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((s) => {
                    const initials = s.name
                      ? s.name
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0].toUpperCase())
                          .join('')
                      : 'S';

                    return (
                      <tr key={s.id} className="hover:bg-[#FAF8FC] transition-colors">
                        {/* NAME */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#EAE2EC]/60">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1E1320]">{s.name}</div>
                              {s.price_range && (
                                <div className="text-[11px] text-[#8C7A8E] font-medium">{s.price_range}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-6 py-4">
                          <span className="bg-[#F6F3F7] text-[#42143E] border border-[#E6DEE8] rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center">
                            {s.category}
                          </span>
                        </td>

                        {/* LOCATION */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-[#5A4B5C] text-sm">
                            <MapPin className="w-3.5 h-3.5 text-[#8C7A8E] shrink-0" />
                            <span className="truncate max-w-[200px]" title={s.location}>{s.location || '—'}</span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStatus(s)}
                            title="Click to toggle status"
                            className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 transition-all cursor-pointer hover:opacity-90 capitalize ${
                              s.status === 'published'
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                                : 'bg-[#F3EFF5] border-[#E5DEE7] text-[#6E5D70]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.status === 'published' ? 'bg-[#059669]' : 'bg-[#9CA3AF]'
                              }`}
                            />
                            {s.status}
                          </button>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(s)}
                              className="bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#42143E] font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              className="bg-rose-50/70 hover:bg-rose-100 text-[#DC2626] font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredSuppliers.length > 0 && (
            <div className="p-4 bg-white border-t border-[#F1ECF2] flex items-center justify-between text-xs text-[#6E5D70]">
              <div>
                Showing page <span className="font-semibold text-[#1E1320]">{currentPage}</span> of{' '}
                <span className="font-semibold text-[#1E1320]">{totalPages}</span> ({filteredSuppliers.length} total suppliers)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320] disabled:opacity-40 hover:bg-[#FAF8FA] cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-semibold text-[#1E1320] px-2">{currentPage}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320] disabled:opacity-40 hover:bg-[#FAF8FA] cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[22px] shadow-2xl border border-[#E6DEE8] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F1ECF2]">
              <div>
                <h2 className="text-xl font-bold text-[#1E1320]">
                  {editing ? 'Edit Supplier' : 'Add Supplier'}
                </h2>
                <p className="text-xs text-[#6E5D70] mt-0.5">
                  {editing ? 'Update directory information' : 'Create a new supplier listing'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-[#8C7A8E] hover:text-[#1E1320] hover:bg-[#F6F3F7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 mb-6">
              {(
                [
                  ['name', 'Name', 'e.g. Manila Packaging Supply'],
                  ['category', 'Category', 'e.g. Packaging, Raw Materials'],
                  ['location', 'Location', 'e.g. Divisoria, Manila'],
                  ['price_range', 'Price Range', 'e.g. ₱₱ or Affordable'],
                  ['phone', 'Phone Number', 'e.g. +63 912 345 6789'],
                  ['image_url', 'Image URL', 'https://...'],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-[#1E1320] mb-1.5">
                    {label}
                  </label>
                  <input
                    value={(draft[field] as string) ?? ''}
                    onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  id="status"
                  type="checkbox"
                  checked={draft.status === 'published'}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.checked ? 'published' : 'hidden' })
                  }
                  className="w-4 h-4 rounded text-[#42143E] accent-[#42143E] focus:ring-[#42143E]/20 cursor-pointer"
                />
                <label htmlFor="status" className="text-sm font-medium text-[#1E1320] cursor-pointer">
                  Published (visible in the app)
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-[#E6DEE8] bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#1E1320] font-semibold py-2.5 text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim() || !draft.category.trim()}
                className="flex-1 rounded-xl bg-[#42143E] hover:bg-[#310E2E] active:scale-[0.99] text-white font-semibold py-2.5 text-sm shadow-[0_4px_12px_rgba(66,20,62,0.2)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

