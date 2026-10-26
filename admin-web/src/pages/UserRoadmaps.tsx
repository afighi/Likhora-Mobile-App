import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchAllUsers,
  fetchUserRoadmap,
  injectUserRoadmapTask,
  updateUserRoadmapTask,
  deleteUserRoadmapTask,
  assignCuratedRoadmapToUser,
  sendUserNotification,
  cleanDuplicateRoadmapTasks,
  updateUserProfile,
  type UserProfile,
  type RoadmapTask,
} from '../lib/supabase';
import {
  Users,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Clock,
  Coins,
  Bell,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Wand2,
} from 'lucide-react';

const CURATED_ASSIGNMENT_TEMPLATES = [
  {
    name: 'Philippine MSME Legal & Registration Standard',
    type: 'General MSME',
    tasks: [
      {
        title: 'Barangay Business Clearance',
        category: 'Permits',
        agency: 'Barangay Hall',
        estimated_cost: '₱300 - ₱500',
        estimated_time: '1 Day',
        desc: 'Obtain clearance from the local barangay where the business operates.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'b1', title: 'Submit 2 valid IDs and proof of address', completed: false },
          { id: 'b2', title: 'Pay barangay clearance fee and claim certificate', completed: false },
        ],
      },
      {
        title: 'DTI Business Name Registration (BNRS)',
        category: 'Permits',
        agency: 'DTI BNRS Online',
        estimated_cost: '₱500 - ₱1,000',
        estimated_time: '1 Day',
        desc: 'Register business name under Sole Proprietorship via bnrs.dti.gov.ph.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'd1', title: 'Check name availability on DTI portal', completed: false },
          { id: 'd2', title: 'Complete application and download DTI certificate', completed: false },
        ],
      },
      {
        title: "Mayor's / City Hall Business Permit & Sanitary Inspection",
        category: 'Permits',
        agency: 'City / Municipal BPLO',
        estimated_cost: '₱2,000 - ₱4,500',
        estimated_time: '3 - 5 Days',
        desc: 'Secure final local government operational license with City Health and Fire clearance.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'm1', title: 'Submit DTI and Barangay Clearance to City BPLO', completed: false },
          { id: 'm2', title: 'Undergo fire safety inspection certificate (FSIC)', completed: false },
        ],
      },
      {
        title: 'BIR Form 1901 Registration & Authority to Print Invoices',
        category: 'Finance',
        agency: 'BIR Revenue District Office (RDO)',
        estimated_cost: '₱500 registration + printing',
        estimated_time: '2 - 4 Days',
        desc: 'Register business TIN, choose 8% Gross Income Tax option if eligible, and print Official Receipts.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'r1', title: 'File BIR Form 1901 with Mayor’s Permit and DTI Certificate', completed: false },
          { id: 'r2', title: 'Secure Authority to Print (ATP) and register Books of Accounts', completed: false },
        ],
      },
    ],
  },
  {
    name: 'Food & Beverage Regulatory Roadmap',
    type: 'Food & Beverage',
    tasks: [
      {
        title: 'Food Handler Medical Exam & City Health Sanitary Permit',
        category: 'Health',
        agency: 'City Health Office (Sanitation Section)',
        estimated_cost: '₱600 - ₱1,200',
        estimated_time: '2 - 3 Days',
        desc: 'Complete chest X-ray, stool exam, and obtain green food handler health card for all food service crew.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'f1', title: 'Complete laboratory tests at accredited city health clinic', completed: false },
          { id: 'f2', title: 'Attend food safety & sanitation orientation seminar', completed: false },
        ],
      },
      {
        title: 'Cold-Chain & Wet Market Ingredient Canvassing',
        category: 'Supplies',
        agency: 'Wholesale Food Terminal / Public Markets',
        estimated_cost: '₱10,000 - ₱20,000',
        estimated_time: '3 Days',
        desc: 'Contract minimum 2 backup meat and fresh produce suppliers to protect margin against inflation.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'f3', title: 'Compare wholesale prices with Divisoria/Balintawak hubs', completed: false },
          { id: 'f4', title: 'Test raw ingredient storage temperatures and shelf life', completed: false },
        ],
      },
      {
        title: 'Food Costing & Portion Standardization',
        category: 'Finance',
        agency: 'Self-managed (Smart Calculator)',
        estimated_cost: 'Free',
        estimated_time: '2 Days',
        desc: 'Standardize kitchen ladle scoops and calculate ingredient wastage at 15% to maintain 40% margin.',
        status: 'Pending' as const,
        sub_steps: [
          { id: 'f5', title: 'Log batch yields using Likhora Smart Calculator', completed: false },
          { id: 'f6', title: 'Set dine-in and takeout delivery pricing tiers', completed: false },
        ],
      },
    ],
  },
];

const USER_PAGE_SIZE = 6;
const TASK_PAGE_SIZE = 6;

export default function UserRoadmaps() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);

  // Selected User State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTasks, setUserTasks] = useState<RoadmapTask[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState('All');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [taskPage, setTaskPage] = useState(1);

  // Inject Task Modal
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectTitle, setInjectTitle] = useState('');
  const [injectCategory, setInjectCategory] = useState('Operations');
  const [injectAgency, setInjectAgency] = useState('');
  const [injectDesc, setInjectDesc] = useState('');
  const [injectTime, setInjectTime] = useState('1 - 2 Days');
  const [injectCost, setInjectCost] = useState('Free');
  const [injectSubSteps, setInjectSubSteps] = useState<{ id: string; title: string; completed: boolean }[]>([
    { id: 's1', title: 'Review requirements and prepare checklist', completed: false },
  ]);
  const [savingTask, setSavingTask] = useState(false);

  // Send Notification Modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('Admin Advisory');
  const [notifyDesc, setNotifyDesc] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await fetchAllUsers();
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.business_name?.toLowerCase().includes(q) ||
        u.business_type?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USER_PAGE_SIZE;
    return filteredUsers.slice(start, start + USER_PAGE_SIZE);
  }, [filteredUsers, userPage]);

  const handleSelectUser = async (u: UserProfile) => {
    setSelectedUser(u);
    setLoadingRoadmap(true);
    setSelectedPhase('All');
    setTaskPage(1);
    setExpandedTaskIds(new Set());
    const res = await fetchUserRoadmap(u.id);
    setUserTasks(res.data || []);
    setRawCount(res.rawTotal || 0);
    setLoadingRoadmap(false);
  };

  // Phase categories from active user tasks
  const availablePhases = useMemo(() => {
    const categories = Array.from(new Set(userTasks.map((t) => t.category).filter(Boolean)));
    return ['All', ...categories];
  }, [userTasks]);

  // Filtered & Paginated Tasks
  const phaseFilteredTasks = useMemo(() => {
    if (selectedPhase === 'All') return userTasks;
    return userTasks.filter((t) => t.category === selectedPhase);
  }, [userTasks, selectedPhase]);

  const totalTaskPages = Math.max(1, Math.ceil(phaseFilteredTasks.length / TASK_PAGE_SIZE));
  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * TASK_PAGE_SIZE;
    return phaseFilteredTasks.slice(start, start + TASK_PAGE_SIZE);
  }, [phaseFilteredTasks, taskPage]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTaskIds(next);
  };

  const handleExpandAll = () => {
    const allIds = new Set(userTasks.map((t) => t.id || t.title));
    setExpandedTaskIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedTaskIds(new Set());
  };

  const handleCleanDuplicates = async () => {
    if (!user || !selectedUser) return;
    const { countRemoved } = await cleanDuplicateRoadmapTasks(selectedUser.id, user.uid);
    if (countRemoved > 0) {
      setNotice(`Cleaned and removed ${countRemoved} duplicate roadmap step(s) from database.`);
    } else {
      setNotice('No database duplicate rows detected.');
    }
    const res = await fetchUserRoadmap(selectedUser.id);
    setUserTasks(res.data || []);
    setRawCount(res.rawTotal || 0);
  };

  const handleToggleAdminRole = async () => {
    if (!user || !selectedUser) return;
    const nextStatus = !selectedUser.is_admin;
    const { error } = await updateUserProfile(selectedUser.id, { is_admin: nextStatus }, user.uid);
    if (!error) {
      setSelectedUser({ ...selectedUser, is_admin: nextStatus });
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, is_admin: nextStatus } : u)));
      setNotice(`Updated admin privilege for ${selectedUser.full_name || selectedUser.email} to ${nextStatus ? 'Admin' : 'Regular User'}.`);
    } else {
      setNotice(`Error updating role: ${error.message}`);
    }
  };

  const handleOpenInjectModal = () => {
    setInjectTitle('');
    setInjectCategory('Operations');
    setInjectAgency('');
    setInjectDesc('');
    setInjectTime('1 - 2 Days');
    setInjectCost('Free');
    setInjectSubSteps([{ id: `s-${Date.now()}`, title: 'First action step', completed: false }]);
    setShowInjectModal(true);
  };

  const handleAddSubStep = () => {
    setInjectSubSteps([
      ...injectSubSteps,
      { id: `s-${Date.now()}`, title: 'New action item', completed: false },
    ]);
  };

  const handleRemoveSubStep = (idx: number) => {
    setInjectSubSteps(injectSubSteps.filter((_, i) => i !== idx));
  };

  const handleSubStepChange = (idx: number, val: string) => {
    const updated = [...injectSubSteps];
    updated[idx].title = val;
    setInjectSubSteps(updated);
  };

  const handleSaveInjectedTask = async () => {
    if (!user || !selectedUser || !injectTitle.trim()) return;
    setSavingTask(true);

    const stepOrder = userTasks.length + 1;
    const { error } = await injectUserRoadmapTask(
      selectedUser.id,
      {
        title: injectTitle,
        category: injectCategory,
        desc: injectDesc,
        agency: injectAgency,
        estimated_time: injectTime,
        estimated_cost: injectCost,
        status: 'Pending',
        step_order: stepOrder,
        sub_steps: injectSubSteps,
        required_docs: [],
      },
      user.uid
    );

    if (error) {
      setNotice(`Could not add step: ${error.message}`);
    } else {
      setNotice(`Assigned "${injectTitle}" directly to ${selectedUser.full_name || selectedUser.email}'s roadmap.`);
      setShowInjectModal(false);
      const res = await fetchUserRoadmap(selectedUser.id);
      setUserTasks(res.data || []);
      setRawCount(res.rawTotal || 0);
    }
    setSavingTask(false);
  };

  const handleAssignTemplate = async (template: (typeof CURATED_ASSIGNMENT_TEMPLATES)[0]) => {
    if (!user || !selectedUser) return;
    if (
      !confirm(
        `Assign the entire "${template.name}" (${template.tasks.length} steps) to ${
          selectedUser.full_name || selectedUser.email
        }? This will add these steps to their active roadmap.`
      )
    )
      return;

    const { error } = await assignCuratedRoadmapToUser(
      selectedUser.id,
      template.tasks,
      template.name,
      user.uid
    );

    if (error) {
      setNotice(`Error assigning template: ${error.message}`);
    } else {
      setNotice(`Assigned "${template.name}" to user's roadmap.`);
      const res = await fetchUserRoadmap(selectedUser.id);
      setUserTasks(res.data || []);
      setRawCount(res.rawTotal || 0);
    }
  };

  const handleToggleTaskStatus = async (task: RoadmapTask) => {
    if (!user || !task.id || !selectedUser) return;
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const { error } = await updateUserRoadmapTask(task.id, { status: nextStatus }, user.uid);
    if (!error) {
      setUserTasks(
        userTasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    }
  };

  const handleDeleteTask = async (task: RoadmapTask) => {
    if (!user || !task.id || !selectedUser) return;
    if (!confirm(`Delete step "${task.title}" from this user's roadmap?`)) return;
    const { error } = await deleteUserRoadmapTask(task.id, selectedUser.id, user.uid);
    if (!error) {
      setUserTasks(userTasks.filter((t) => t.id !== task.id));
      setNotice(`Deleted step "${task.title}".`);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedUser || !notifyTitle.trim() || !notifyDesc.trim()) return;
    setSendingNotice(true);
    await sendUserNotification(selectedUser.id, notifyTitle, notifyDesc, 'admin_broadcast');
    setNotice(`Sent notification to ${selectedUser.full_name || selectedUser.email}.`);
    setSendingNotice(false);
    setShowNotifyModal(false);
  };

  const completedCount = userTasks.filter((t) => t.status === 'Completed').length;
  const progressPct = userTasks.length > 0 ? Math.round((completedCount / userTasks.length) * 100) : 0;
  const duplicateDetected = rawCount > userTasks.length;

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1320]">
          User Directory & Roadmap Operations
        </h1>
        <p className="text-sm text-[#6E5D70] mt-1.5">
          Detailed founder profiles, permissions, roadmap step injections, and clean phase navigation.
        </p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-4 rounded-xl bg-[#FAF6FB] border border-[#E8DCEB] text-[#42143E] text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#42143E] shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button
            onClick={() => setNotice('')}
            className="text-xs font-semibold text-[#8C7A8E] hover:text-[#42143E] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* User Directory Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)]">
            <div className="p-4 border-b border-[#F1ECF2] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, email, or business..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] placeholder-[#8C7A8E] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F3EFF5]">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#6E5D70]">Loading registered users…</div>
              ) : paginatedUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6E5D70]">
                  No users found in database profiles.
                </div>
              ) : (
                paginatedUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const initials = (u.full_name || u.email || 'U').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected ? 'bg-[#F6F3F7] border-l-4 border-l-[#42143E]' : 'hover:bg-[#FAF8FC]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E6DEE8] text-[#42143E] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-xs text-[#1E1320] truncate">
                              {u.full_name || 'Unnamed Founder'}
                            </p>
                            {u.is_admin && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8C7A8E] truncate">{u.email}</p>
                          {u.business_name && (
                            <p className="text-[11px] text-[#42143E] font-medium truncate mt-0.5">
                              {u.business_name} • {u.business_type || 'MSME'}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-[#42143E] shrink-0">
                        Inspect →
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalUserPages > 1 && (
              <div className="p-3 border-t border-[#F1ECF2] bg-[#FAF8FA] flex items-center justify-between text-xs text-[#6E5D70]">
                <span>
                  Page {userPage} of {totalUserPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Details & Roadmap Inspector Column */}
        <div className="lg:col-span-7 space-y-4">
          {selectedUser ? (
            <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-6 space-y-5">
              {/* Detailed User Management Header */}
              <div className="pb-4 border-b border-[#F1ECF2] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#1E1320]">
                        {selectedUser.full_name || 'Founder'}
                      </h2>
                      <span className="text-xs font-mono text-[#8C7A8E] px-2 py-0.5 rounded bg-[#F6F3F7]">
                        UID: {selectedUser.id.slice(0, 8)}…
                      </span>
                      {selectedUser.is_admin ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Administrator
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          Standard User
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6E5D70] mt-0.5">{selectedUser.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleAdminRole}
                      title="Toggle admin authorization"
                      className="px-3 py-1.5 rounded-xl border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] text-xs font-semibold text-[#1E1320] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {selectedUser.is_admin ? <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{selectedUser.is_admin ? 'Revoke Admin' : 'Grant Admin'}</span>
                    </button>
                    <button
                      onClick={() => setShowNotifyModal(true)}
                      className="px-3 py-1.5 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] hover:bg-[#F6F3F7] text-[#42143E] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Notify</span>
                    </button>
                    <button
                      onClick={handleOpenInjectModal}
                      className="px-3.5 py-1.5 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Inject Step</span>
                    </button>
                  </div>
                </div>

                {/* Profile Grid Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#FAF8FA] border border-[#F1ECF2]">
                    <span className="text-[#8C7A8E] text-[10px] block">Business Name</span>
                    <span className="font-semibold text-[#1E1320] truncate block">
                      {selectedUser.business_name || 'Not set'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FA] border border-[#F1ECF2]">
                    <span className="text-[#8C7A8E] text-[10px] block">Industry</span>
                    <span className="font-semibold text-[#1E1320] truncate block">
                      {selectedUser.business_type || 'General MSME'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FA] border border-[#F1ECF2]">
                    <span className="text-[#8C7A8E] text-[10px] block">Location</span>
                    <span className="font-semibold text-[#1E1320] truncate block">
                      {selectedUser.location || 'Philippines'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF8FA] border border-[#F1ECF2]">
                    <span className="text-[#8C7A8E] text-[10px] block">Onboarding</span>
                    <span className="font-semibold text-[#1E1320] truncate block">
                      {selectedUser.onboarded ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Clean Duplicates Banner */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-[#FAF8FA] border border-[#E6DEE8]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1E1320]">
                      Roadmap Milestone Progress
                    </span>
                    <span className="text-xs font-semibold text-[#42143E]">
                      {completedCount} / {userTasks.length} Completed ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#EAE2EC] overflow-hidden">
                    <div
                      className="h-full bg-[#42143E] transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>

                {duplicateDetected && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between text-amber-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Found redundant duplicate tasks ({rawCount} raw rows in database vs {userTasks.length} unique steps).
                      </span>
                    </div>
                    <button
                      onClick={handleCleanDuplicates}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-semibold text-[11px] text-amber-900 hover:bg-amber-100 cursor-pointer shrink-0"
                    >
                      Clean Duplicates in DB
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Template Assignment */}
              <div className="p-3.5 rounded-xl bg-[#FAF6FB] border border-[#E8DCEB]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#42143E] mb-2">
                  <Wand2 className="w-4 h-4 text-[#42143E]" />
                  <span>Assign Curated Roadmap Template</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CURATED_ASSIGNMENT_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAssignTemplate(tmpl)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-[#E6DEE8] text-[#1E1320] hover:border-[#42143E] hover:text-[#42143E] transition-all cursor-pointer shadow-xs"
                    >
                      + {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase / Category Tabs & Accordion Controls (Fixes "too long" issue) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-md">
                    {availablePhases.map((phase) => {
                      const isActive = selectedPhase === phase;
                      return (
                        <button
                          key={phase}
                          onClick={() => {
                            setSelectedPhase(phase);
                            setTaskPage(1);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-[#42143E] text-white shadow-xs'
                              : 'bg-[#FAF8FA] border border-[#E6DEE8] text-[#6E5D70] hover:text-[#1E1320]'
                          }`}
                        >
                          {phase}
                        </button>
                      );
                    })}
                  </div>

                  {/* Expand/Collapse All */}
                  <div className="flex items-center gap-2 text-xs text-[#42143E]">
                    <button
                      onClick={handleExpandAll}
                      className="hover:underline font-semibold cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span>•</span>
                    <button
                      onClick={handleCollapseAll}
                      className="hover:underline font-semibold cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Compact Accordion Stepper List */}
                {loadingRoadmap ? (
                  <div className="p-8 text-center text-xs text-[#6E5D70]">Loading roadmap tasks…</div>
                ) : paginatedTasks.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#E6DEE8] rounded-xl text-xs text-[#6E5D70]">
                    No roadmap steps under this category.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paginatedTasks.map((t, idx) => {
                      const taskId = t.id || `${t.title}-${idx}`;
                      const isExpanded = expandedTaskIds.has(taskId);
                      const isDone = t.status === 'Completed';

                      return (
                        <div
                          key={taskId}
                          className={`rounded-xl border transition-all ${
                            isDone ? 'bg-[#F9FCFA] border-emerald-200' : 'bg-white border-[#E6DEE8]'
                          }`}
                        >
                          {/* Accordion Bar Header */}
                          <div
                            onClick={() => toggleExpand(taskId)}
                            className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isDone ? 'bg-emerald-600 text-white' : 'bg-[#42143E] text-white'
                                }`}
                              >
                                {t.step_order || idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h4
                                  className={`font-semibold text-xs truncate ${
                                    isDone ? 'line-through text-neutral-400' : 'text-[#1E1320]'
                                  }`}
                                >
                                  {t.title}
                                </h4>
                                <span className="text-[10px] text-[#8C7A8E]">
                                  {t.category} {t.agency ? `• ${t.agency}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskStatus(t);
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                                  isDone
                                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                                    : 'bg-[#F3EFF5] border-[#E5DEE7] text-[#6E5D70]'
                                }`}
                              >
                                {t.status}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(t);
                                }}
                                className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#8C7A8E]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#8C7A8E]" />
                              )}
                            </div>
                          </div>

                          {/* Expandable Accordion Body */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-[#F3EFF5] text-xs space-y-2.5">
                              {t.desc && (
                                <p className="text-[#5A4B5C] leading-relaxed pt-2">{t.desc}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-[#6E5D70]">
                                {t.estimated_cost && (
                                  <div className="flex items-center gap-1">
                                    <Coins className="w-3 h-3 text-[#8C7A8E]" />
                                    <span>Cost: {t.estimated_cost}</span>
                                  </div>
                                )}
                                {t.estimated_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#8C7A8E]" />
                                    <span>Time: {t.estimated_time}</span>
                                  </div>
                                )}
                              </div>

                              {/* Substeps */}
                              {t.sub_steps && t.sub_steps.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <p className="text-[11px] font-semibold text-[#1E1320]">
                                    Action Checklist:
                                  </p>
                                  {t.sub_steps.map((sub, sIdx) => (
                                    <div key={sIdx} className="flex items-center gap-2 text-[11px] text-[#5A4B5C]">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          sub.completed ? 'bg-emerald-500' : 'bg-neutral-400'
                                        }`}
                                      ></span>
                                      <span className={sub.completed ? 'line-through text-neutral-400' : ''}>
                                        {sub.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tasks Pagination Controls */}
                {totalTaskPages > 1 && (
                  <div className="p-3 rounded-xl border border-[#F1ECF2] bg-[#FAF8FA] flex items-center justify-between text-xs text-[#6E5D70] mt-3">
                    <span>
                      Page {taskPage} of {totalTaskPages} ({phaseFilteredTasks.length} milestones)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={taskPage <= 1}
                        onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={taskPage >= totalTaskPages}
                        onClick={() => setTaskPage((p) => Math.min(totalTaskPages, p + 1))}
                        className="p-1 rounded-lg border border-[#E6DEE8] bg-white hover:bg-[#F6F3F7] disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1E1320]">No founder selected</h3>
              <p className="text-xs text-[#6E5D70] mt-1 max-w-sm mx-auto">
                Select a user from the directory on the left to inspect their profile, roadmap progress, or assign new steps.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inject Task Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[22px] shadow-2xl border border-[#E6DEE8] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div>
                <h3 className="text-lg font-bold text-[#1E1320]">Inject Roadmap Step</h3>
                <p className="text-xs text-[#6E5D70]">
                  Directly adds a custom milestone to {selectedUser?.full_name || 'user'}'s roadmap.
                </p>
              </div>
              <button
                onClick={() => setShowInjectModal(false)}
                className="text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Step Title *</label>
              <input
                type="text"
                required
                value={injectTitle}
                onChange={(e) => setInjectTitle(e.target.value)}
                placeholder="e.g. Apply for City Hall Sanitary Inspection"
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Category</label>
                <input
                  type="text"
                  value={injectCategory}
                  onChange={(e) => setInjectCategory(e.target.value)}
                  placeholder="Permits, Finance..."
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3 py-1.5 text-xs text-[#1E1320]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Responsible Agency</label>
                <input
                  type="text"
                  value={injectAgency}
                  onChange={(e) => setInjectAgency(e.target.value)}
                  placeholder="City Health Office"
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3 py-1.5 text-xs text-[#1E1320]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Estimated Cost</label>
                <input
                  type="text"
                  value={injectCost}
                  onChange={(e) => setInjectCost(e.target.value)}
                  placeholder="₱500"
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3 py-1.5 text-xs text-[#1E1320]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Estimated Time</label>
                <input
                  type="text"
                  value={injectTime}
                  onChange={(e) => setInjectTime(e.target.value)}
                  placeholder="2 Days"
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3 py-1.5 text-xs text-[#1E1320]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Description / Instructions</label>
              <textarea
                rows={2}
                value={injectDesc}
                onChange={(e) => setInjectDesc(e.target.value)}
                placeholder="Actionable guidance for the entrepreneur..."
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-xs text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            {/* Checklist Sub-steps */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#1E1320]">Action Checklist Items</label>
                <button
                  type="button"
                  onClick={handleAddSubStep}
                  className="text-xs font-semibold text-[#42143E] hover:underline cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-1.5">
                {injectSubSteps.map((sub, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A8E]"></span>
                    <input
                      type="text"
                      value={sub.title}
                      onChange={(e) => handleSubStepChange(sIdx, e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubStep(sIdx)}
                      className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1ECF2]">
              <button
                type="button"
                onClick={() => setShowInjectModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6DEE8] bg-white text-xs font-semibold text-[#1E1320] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInjectedTask}
                disabled={savingTask || !injectTitle.trim()}
                className="px-5 py-2 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingTask ? 'Injecting…' : 'Add to User Roadmap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[22px] shadow-2xl border border-[#E6DEE8] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div>
                <h3 className="text-lg font-bold text-[#1E1320]">Direct Notification</h3>
                <p className="text-xs text-[#6E5D70]">
                  Sends in-app alert to {selectedUser?.full_name || 'user'}.
                </p>
              </div>
              <button
                onClick={() => setShowNotifyModal(false)}
                className="text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Notification Subject *</label>
              <input
                type="text"
                required
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="e.g. Roadmap Advisory from LikhAI Admin"
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Message Body *</label>
              <textarea
                rows={3}
                required
                value={notifyDesc}
                onChange={(e) => setNotifyDesc(e.target.value)}
                placeholder="Type your message to this founder..."
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-xs text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1ECF2]">
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6DEE8] bg-white text-xs font-semibold text-[#1E1320] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sendingNotice || !notifyTitle.trim() || !notifyDesc.trim()}
                className="px-5 py-2 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotice ? 'Sending…' : 'Send Notification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
