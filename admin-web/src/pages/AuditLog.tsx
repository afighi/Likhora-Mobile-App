import { useEffect, useState, useMemo } from 'react';
import { fetchAuditLog, type AuditLogRow } from '../lib/supabase';
import {
  ShieldCheck,
  Search,
  X,
  Clock,
  Download,
  Filter,
  Eye,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';

const AUDIT_PAGE_SIZE = 10;

type ActionCategory =
  | 'all'
  | 'security_roles'
  | 'roadmaps'
  | 'forums'
  | 'suppliers'
  | 'broadcasts';

export default function AuditLog() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ActionCategory>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Inspector Modal
  const [inspectRow, setInspectRow] = useState<AuditLogRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await fetchAuditLog();
    if (data) setRows(data as AuditLogRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.action?.toLowerCase().includes(q) ||
        r.target_table?.toLowerCase().includes(q) ||
        r.admin_id?.toLowerCase().includes(q) ||
        r.target_id?.toLowerCase().includes(q) ||
        JSON.stringify(r.details || {}).toLowerCase().includes(q);

      let matchCategory = true;
      const act = (r.action || '').toLowerCase();
      if (categoryFilter === 'security_roles') {
        matchCategory = act.includes('user') || act.includes('role') || act.includes('profile');
      } else if (categoryFilter === 'roadmaps') {
        matchCategory = act.includes('roadmap') || act.includes('task');
      } else if (categoryFilter === 'forums') {
        matchCategory = act.includes('forum') || act.includes('advisory') || act.includes('reply');
      } else if (categoryFilter === 'suppliers') {
        matchCategory = act.includes('supplier');
      } else if (categoryFilter === 'broadcasts') {
        matchCategory = act.includes('broadcast') || act.includes('notification');
      }

      return matchSearch && matchCategory;
    });
  }, [rows, searchQuery, categoryFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / AUDIT_PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * AUDIT_PAGE_SIZE;
    return filteredRows.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredRows, currentPage]);

  // KPI Calculations
  const uniqueAdminsCount = useMemo(() => {
    return new Set(rows.map((r) => r.admin_id).filter(Boolean)).size;
  }, [rows]);

  const highImpactCount = useMemo(() => {
    return rows.filter((r) => {
      const act = (r.action || '').toLowerCase();
      return (
        act.includes('delete') ||
        act.includes('remove') ||
        act.includes('clean') ||
        act.includes('is_admin') ||
        act.includes('role')
      );
    }).length;
  }, [rows]);

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('clean') || act.includes('deduplicate')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (act.includes('create') || act.includes('insert') || act.includes('publish')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('role') || act.includes('profile') || act.includes('user')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-[#F6F3F7] text-[#42143E] border-[#E6DEE8]';
  };

  const formatPSTDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000));
      if (elapsedMinutes < 1) return 'Just now';
      if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      if (elapsedHours < 24) return `${elapsedHours}h ago`;
      return `${Math.floor(elapsedHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const handleCopyJson = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = ['Event ID', 'PST Timestamp', 'Action', 'Target Entity', 'Target Record ID', 'Admin Identifier', 'Payload JSON'];
    const csvLines = [headers.join(',')];

    filteredRows.forEach((r) => {
      const line = [
        `"${r.id}"`,
        `"${formatPSTDate(r.created_at)}"`,
        `"${r.action}"`,
        `"${r.target_table}"`,
        `"${r.target_id || ''}"`,
        `"${r.admin_id}"`,
        `"${JSON.stringify(r.details || {}).replace(/"/g, '""')}"`,
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `likhai_audit_ledger_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportNotice('Exported Audit Trail Ledger (CSV) to downloads.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  const handleExportJSON = () => {
    if (filteredRows.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `likhai_audit_ledger_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportNotice('Exported Audit Trail Ledger (JSON) to downloads.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#42143E]/5 border border-[#42143E]/10 text-xs font-semibold text-[#42143E] mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Immutable Security Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1320]">
            Detailed Audit Trail & Security Ledger
          </h1>
          <p className="text-sm text-[#6E5D70] mt-1">
            Cryptographically-timestamped administrative ledger tracking founder role privileges, roadmap curations, and system broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLogs}
            className="p-2.5 rounded-xl border border-[#E6DEE8] bg-white hover:bg-[#FAF8FA] text-[#6E5D70] hover:text-[#1E1320] transition-colors cursor-pointer shadow-xs"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2.5 rounded-xl border border-[#E6DEE8] bg-white hover:bg-[#FAF8FA] text-[#1E1320] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#42143E]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Export Notice Banner */}
      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{exportNotice}</span>
          <button onClick={() => setExportNotice('')} className="p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-4 border border-[rgba(66,20,62,0.08)] shadow-[0_4px_16px_rgba(30,19,32,0.03)] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#6E5D70]">
            <span>Total Recorded Events</span>
            <Database className="w-4 h-4 text-[#42143E]" />
          </div>
          <div className="text-2xl font-bold text-[#1E1320]">
            {loading ? '…' : rows.length}
          </div>
          <p className="text-[11px] text-[#8C7A8E]">Audited administrative mutations</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 border border-[rgba(66,20,62,0.08)] shadow-[0_4px_16px_rgba(30,19,32,0.03)] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#6E5D70]">
            <span>Unique Admin Actors</span>
            <UserCheck className="w-4 h-4 text-[#42143E]" />
          </div>
          <div className="text-2xl font-bold text-[#1E1320]">
            {loading ? '…' : uniqueAdminsCount}
          </div>
          <p className="text-[11px] text-[#8C7A8E]">Active admin accounts recorded</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 border border-[rgba(66,20,62,0.08)] shadow-[0_4px_16px_rgba(30,19,32,0.03)] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#6E5D70]">
            <span>High-Impact Mutations</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {loading ? '…' : highImpactCount}
          </div>
          <p className="text-[11px] text-[#8C7A8E]">Privilege escalations & deletions</p>
        </div>

        <div className="bg-white rounded-[20px] p-4 border border-[rgba(66,20,62,0.08)] shadow-[0_4px_16px_rgba(30,19,32,0.03)] space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#6E5D70]">
            <span>Latest Recorded Event</span>
            <Clock className="w-4 h-4 text-[#42143E]" />
          </div>
          <div className="text-sm font-bold text-[#1E1320] truncate">
            {rows[0] ? rows[0].action : 'No actions yet'}
          </div>
          <p className="text-[11px] text-[#8C7A8E]">
            {rows[0] ? getRelativeTime(rows[0].created_at) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)]">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-[#F1ECF2] bg-white space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search audit trail by action, table, admin ID, or payload..."
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

            <div className="text-xs text-[#6E5D70] font-medium self-center">
              Showing {filteredRows.length} {filteredRows.length === 1 ? 'event' : 'events'}
            </div>
          </div>

          {/* Quick Action Filter Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-semibold text-[#8C7A8E] mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              <span>Scope:</span>
            </span>

            {[
              { id: 'all', label: 'All Operations' },
              { id: 'security_roles', label: 'Founder Profiles & Roles' },
              { id: 'roadmaps', label: 'Roadmap Mutations' },
              { id: 'forums', label: 'Forums & Advisories' },
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'broadcasts', label: 'Broadcasts' },
            ].map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as ActionCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#42143E] text-white shadow-xs'
                      : 'bg-[#F6F3F7] text-[#6E5D70] hover:text-[#1E1320] hover:bg-[#EAE4EC]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#6E5D70] bg-[#FAF8FB] border-b border-[#EFEAEF]">
                <th className="px-6 py-4">PST Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Entity</th>
                <th className="px-6 py-4">Admin Identifier</th>
                <th className="px-6 py-4">Payload Summary</th>
                <th className="px-6 py-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EFF5]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-[#6E5D70]">
                    <div className="w-8 h-8 mx-auto rounded-lg bg-[#F6F3F7] text-[#42143E] flex items-center justify-center font-bold mb-2 animate-pulse">
                      <Clock className="w-4 h-4" />
                    </div>
                    Retrieving immutable audit records…
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-2">
                      <ShieldCheck className="w-5 h-5 text-[#8C7A8E]" />
                    </div>
                    <p className="text-sm font-semibold text-[#1E1320]">No audit trail records found</p>
                    <p className="text-xs text-[#6E5D70] mt-1">Try clearing search terms or category filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const detailsKeys = Object.keys(r.details || {});
                  return (
                    <tr key={r.id} className="hover:bg-[#FAF8FC] transition-colors">
                      {/* TIMESTAMP */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-[#1E1320]">
                          {formatPSTDate(r.created_at)}
                        </div>
                        <div className="text-[11px] text-[#8C7A8E]">
                          {getRelativeTime(r.created_at)}
                        </div>
                      </td>

                      {/* ACTION BADGE */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border inline-flex items-center ${getActionBadge(
                            r.action
                          )}`}
                        >
                          {r.action}
                        </span>
                      </td>

                      {/* TARGET ENTITY */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-[#1E1320] flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-[#8C7A8E]" />
                          <span>{r.target_table}</span>
                        </div>
                        {r.target_id && (
                          <div className="text-[11px] text-[#8C7A8E] font-mono mt-0.5">
                            ID: {r.target_id.slice(0, 14)}…
                          </div>
                        )}
                      </td>

                      {/* ADMIN IDENTIFIER */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#42143E] bg-[#F6F3F7] px-2 py-0.5 rounded border border-[#E6DEE8]">
                          {r.admin_id.slice(0, 12)}…
                        </span>
                      </td>

                      {/* PAYLOAD SUMMARY */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#6E5D70] max-w-xs truncate font-mono">
                          {detailsKeys.length > 0 ? (
                            <span>{JSON.stringify(r.details)}</span>
                          ) : (
                            <span className="italic text-[#8C7A8E]">No payload</span>
                          )}
                        </div>
                      </td>

                      {/* INSPECTION BUTTON */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectRow(r)}
                          className="px-3 py-1.5 rounded-lg border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] text-xs font-semibold text-[#42143E] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Container Pagination Controls */}
        {filteredRows.length > 0 && (
          <div className="p-4 bg-white border-t border-[#F1ECF2] flex items-center justify-between text-xs text-[#6E5D70]">
            <div>
              Showing page <span className="font-semibold text-[#1E1320]">{currentPage}</span> of{' '}
              <span className="font-semibold text-[#1E1320]">{totalPages}</span> ({filteredRows.length} total records)
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

      {/* Inspect Modal Drawer */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-2xl w-full p-6 shadow-2xl border border-[#E6DEE8] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF6FB] text-[#42143E] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E1320]">
                    Audit Record Inspection
                  </h3>
                  <p className="text-xs text-[#6E5D70]">
                    Ledger Event #{inspectRow.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectRow(null)}
                className="text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#FAF8FA] rounded-xl border border-[#E6DEE8] text-xs">
              <div>
                <span className="text-[#8C7A8E] font-medium block">Action Executed:</span>
                <span className="font-semibold text-[#1E1320]">{inspectRow.action}</span>
              </div>
              <div>
                <span className="text-[#8C7A8E] font-medium block">PST Timestamp:</span>
                <span className="font-semibold text-[#1E1320]">{formatPSTDate(inspectRow.created_at)}</span>
              </div>
              <div>
                <span className="text-[#8C7A8E] font-medium block">Target Database Entity:</span>
                <span className="font-semibold text-[#1E1320]">{inspectRow.target_table}</span>
              </div>
              <div>
                <span className="text-[#8C7A8E] font-medium block">Target ID:</span>
                <span className="font-mono text-[#1E1320]">{inspectRow.target_id || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#8C7A8E] font-medium block">Administrator Identifier:</span>
                <span className="font-mono text-[#42143E]">{inspectRow.admin_id}</span>
              </div>
            </div>

            {/* JSON Payload Inspector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1E1320] uppercase tracking-wider">
                  Event Metadata & Mutation Diff (JSON)
                </label>
                <button
                  onClick={() => handleCopyJson(inspectRow.details)}
                  className="text-xs text-[#42143E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="rounded-xl bg-[#1E1320] p-4 font-mono text-xs text-rose-100 overflow-x-auto max-h-64 border border-[#3A1837]">
                <pre>{JSON.stringify(inspectRow.details, null, 2)}</pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1ECF2]">
              <button
                type="button"
                onClick={() => setInspectRow(null)}
                className="px-5 py-2 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
