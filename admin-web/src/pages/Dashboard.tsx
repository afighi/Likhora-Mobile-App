import { useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  fetchAllUsers,
  fetchSuppliers,
  fetchCommunityPosts,
  fetchForumPosts,
  fetchAuditLog,
  type UserProfile,
  type Supplier,
  type CommunityPost,
  type ForumPost,
  type AuditLogRow,
} from '../lib/supabase';
import {
  Users,
  Store,
  Compass,
  MessageSquare,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  FileCheck,
  Building,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [roadmaps, setRoadmaps] = useState<CommunityPost[]>([]);
  const [forums, setForums] = useState<ForumPost[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const [uRes, sRes, rRes, fRes, aRes] = await Promise.all([
        fetchAllUsers(),
        fetchSuppliers(),
        fetchCommunityPosts(),
        fetchForumPosts(),
        fetchAuditLog(),
      ]);

      if (uRes.data) setUsers(uRes.data);
      if (sRes.data) setSuppliers(sRes.data);
      if (rRes.data) setRoadmaps(rRes.data);
      if (fRes.data) setForums(fRes.data);
      if (aRes.data) setAuditLogs(aRes.data);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const onboardedCount = useMemo(() => {
    return users.filter((u) => u.onboarded).length;
  }, [users]);

  const industryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const type = u.business_type || 'Unspecified';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const publishedSuppliers = useMemo(() => {
    return suppliers.filter((s) => s.status === 'published').length;
  }, [suppliers]);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#42143E] via-[#52194D] to-[#310E2E] p-8 text-white shadow-[0_12px_36px_rgba(66,20,62,0.25)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-rose-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LikhAI Philippine MSME Command Center</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Enterprise Operations & Governance
            </h1>
            <p className="text-sm text-rose-100/80 leading-relaxed">
              Curate Philippine micro-enterprise roadmaps, monitor regulatory compliance across LGUs, and publish verified suppliers directly to the mobile ecosystem.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-3 shrink-0">
            <NavLink
              to="/community-roadmaps"
              className="px-4 py-2.5 rounded-xl bg-white text-[#42143E] font-semibold text-xs shadow-md hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Community Roadmap</span>
            </NavLink>
            <NavLink
              to="/forums"
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs backdrop-blur-md border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Broadcast Advisory</span>
            </NavLink>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="bg-white rounded-[22px] p-5 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E5D70]">Registered Founders</span>
            <div className="w-8 h-8 rounded-lg bg-[#F6F3F7] text-[#42143E] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1320]">
              {loading ? '…' : users.length}
            </div>
            <p className="text-[11px] text-[#6E5D70] mt-0.5">
              {onboardedCount} completed onboarding flow
            </p>
          </div>
          <NavLink
            to="/users"
            className="text-xs font-semibold text-[#42143E] hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Manage Directory</span>
            <ArrowRight className="w-3 h-3" />
          </NavLink>
        </div>

        {/* Card 2: Community Roadmaps */}
        <div className="bg-white rounded-[22px] p-5 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E5D70]">Community Templates</span>
            <div className="w-8 h-8 rounded-lg bg-[#F6F3F7] text-[#42143E] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1320]">
              {loading ? '…' : roadmaps.length}
            </div>
            <p className="text-[11px] text-[#6E5D70] mt-0.5">
              Live in mobile Community tab
            </p>
          </div>
          <NavLink
            to="/community-roadmaps"
            className="text-xs font-semibold text-[#42143E] hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Curate Roadmaps</span>
            <ArrowRight className="w-3 h-3" />
          </NavLink>
        </div>

        {/* Card 3: Suppliers */}
        <div className="bg-white rounded-[22px] p-5 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E5D70]">Wholesale Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-[#F6F3F7] text-[#42143E] flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1320]">
              {loading ? '…' : suppliers.length}
            </div>
            <p className="text-[11px] text-[#059669] font-medium mt-0.5">
              {publishedSuppliers} active in Discovery tab
            </p>
          </div>
          <NavLink
            to="/suppliers"
            className="text-xs font-semibold text-[#42143E] hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Verify Suppliers</span>
            <ArrowRight className="w-3 h-3" />
          </NavLink>
        </div>

        {/* Card 4: Forum Inquiries */}
        <div className="bg-white rounded-[22px] p-5 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E5D70]">Forum Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-[#F6F3F7] text-[#42143E] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1E1320]">
              {loading ? '…' : forums.length}
            </div>
            <p className="text-[11px] text-[#6E5D70] mt-0.5">
              Kapihan Q&A threads
            </p>
          </div>
          <NavLink
            to="/forums"
            className="text-xs font-semibold text-[#42143E] hover:underline inline-flex items-center gap-1 pt-1"
          >
            <span>Provide Guidance</span>
            <ArrowRight className="w-3 h-3" />
          </NavLink>
        </div>
      </div>

      {/* Two Column Grid: Compliance Radar + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Philippine Regulatory Compliance Radar */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[22px] p-6 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1E1320]">
                    Philippine MSME Statutory Radar
                  </h2>
                  <p className="text-xs text-[#6E5D70]">Key compliance deadlines across DTI, BIR & LGUs</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Statutory Active
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] flex items-start gap-3">
                <FileCheck className="w-4 h-4 text-[#42143E] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[#1E1320]">LGU Business Permit Renewal Window</p>
                  <p className="text-[#6E5D70]">
                    January 1 to 20 annually for Mayor's Permit, Sanitary inspection, and BFP fire clearance to avoid 25% surcharge under RA 7160.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] flex items-start gap-3">
                <Building className="w-4 h-4 text-[#42143E] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[#1E1320]">BIR Tax Compliance & 8% Income Tax Election</p>
                  <p className="text-[#6E5D70]">
                    Sole proprietorships under ₱3M gross sales can elect the simplified 8% gross income tax in lieu of graduated tax + percentage tax (NIRC Sec 24).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#42143E] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[#1E1320]">BMBE RA 9178 Tax Exemption Verification</p>
                  <p className="text-[#6E5D70]">
                    Eligible micro-enterprises with total assets below ₱3,000,000 are 100% exempt from income taxes upon obtaining DTI Negosyo Center certificate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Industry Distribution */}
          <div className="bg-white rounded-[22px] p-6 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-4">
            <h2 className="text-base font-bold text-[#1E1320]">
              Active MSME Industry Distribution
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {industryBreakdown.slice(0, 6).map(([type, count]) => (
                <div key={type} className="p-3 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] space-y-1">
                  <p className="text-[11px] font-medium text-[#6E5D70] truncate">{type}</p>
                  <p className="text-lg font-bold text-[#42143E]">{count} <span className="text-[10px] text-[#8C7A8E] font-normal">businesses</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Audit Ledger Ticker */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[22px] p-6 border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#42143E]" />
                <h2 className="text-base font-bold text-[#1E1320]">
                  Live Governance Trail
                </h2>
              </div>
              <NavLink to="/audit-log" className="text-xs font-semibold text-[#42143E] hover:underline">
                View All
              </NavLink>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="text-xs text-[#6E5D70]">Loading governance events…</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-[#6E5D70] py-4 text-center">No admin actions recorded yet.</p>
              ) : (
                auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-[#F1ECF2] bg-[#FAF8FA] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F6F3F7] text-[#42143E] border border-[#E6DEE8]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-[#8C7A8E]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#1E1320]">
                      Target: {log.target_table} {log.target_id ? `(#${log.target_id.slice(0, 8)})` : ''}
                    </p>
                    <p className="text-[10px] text-[#6E5D70] font-mono truncate">
                      Admin: {log.admin_id.slice(0, 14)}…
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
