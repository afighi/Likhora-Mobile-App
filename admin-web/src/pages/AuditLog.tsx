import { useEffect, useState } from 'react';
import { fetchAuditLog } from '../lib/supabase';

interface LogRow {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default function AuditLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog().then(({ data }) => {
      if (data) setRows(data as LogRow[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-ink mb-1">Admin Activity Log</h1>
      <p className="text-sm text-inkSoft mb-5">Every moderation/curation action taken through this portal.</p>

      {loading ? (
        <p className="text-sm text-inkSoft">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-inkSoft">No admin actions recorded yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-inkSoft uppercase bg-parchment">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 text-inkSoft whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-ink font-medium">{r.action}</td>
                  <td className="px-4 py-3 text-inkSoft">
                    {r.target_table}
                    {r.target_id ? ` / ${r.target_id.slice(0, 8)}…` : ''}
                  </td>
                  <td className="px-4 py-3 text-inkSoft">{r.admin_id.slice(0, 10)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
