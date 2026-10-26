import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchCommunityPosts,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  type CommunityPost,
  type RoadmapTask,
} from '../lib/supabase';
import {
  Compass,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  ListChecks,
  Sparkles,
  Eye,
  MapPin,
  Clock,
  Coins,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STARTER_PRESETS = [
  {
    name: 'Weekend Coffee Cart Starter',
    type: 'Coffee & Cafe',
    location: 'Metro Manila',
    summary: 'A tested 4-step agile validation roadmap for operating a weekend espresso & cold brew cart before committing to a commercial lease.',
    tasks: [
      {
        title: 'Validate Weekend Foot Traffic & Market Pitch',
        category: 'Research',
        status: 'Pending' as const,
        agency: 'Weekend Market Organizers / Admin',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱500 - ₱1,500 pitch fee',
        desc: 'Visit three target weekend community markets in your area. Survey pedestrian flow, competitive beverage pricing, and stall rental fees.',
        required_docs: ['Valid Government ID', 'Product Portfolio'],
        sub_steps: [
          { id: 'c1', title: 'Survey morning foot traffic at weekend parks', completed: false },
          { id: 'c2', title: 'Compare menu prices of cold brew and pourover stalls', completed: false },
        ],
      },
      {
        title: 'Recipe Standardization & Per-Cup Costing',
        category: 'Finance',
        status: 'Pending' as const,
        agency: 'Self-managed',
        estimated_time: '1 - 2 Days',
        estimated_cost: '₱3,000 trial beans & cups',
        desc: 'Calculate exact unit costs including roasted coffee beans, dairy, oat milk, cups, lids, ice, and 15% operational buffer.',
        required_docs: ['Ingredient Invoices'],
        sub_steps: [
          { id: 'c3', title: 'Compute cost per 16oz cup (target under ₱45 unit cost)', completed: false },
          { id: 'c4', title: 'Set selling price for 45% gross profit margin', completed: false },
        ],
      },
      {
        title: 'Barangay Business Clearance & Food Sanitation',
        category: 'Permits',
        status: 'Pending' as const,
        agency: 'Barangay Hall & City Health Office',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱1,200',
        desc: 'Obtain basic Barangay permit and food handler health certificate for safe consumer beverage handling.',
        required_docs: ['Cedula', 'Food Handler Health Card', 'Barangay Clearance'],
        sub_steps: [
          { id: 'c5', title: 'Undergo food sanitation seminar and chest X-ray', completed: false },
          { id: 'c6', title: 'Secure Barangay Business Clearance for food cart', completed: false },
        ],
      },
      {
        title: 'Soft Launch Weekend Pop-Up',
        category: 'Launch',
        status: 'Pending' as const,
        agency: 'Local Community',
        estimated_time: '2 Weekends',
        estimated_cost: '₱2,000 signage & flyers',
        desc: 'Execute a 2-weekend trial run to gather customer taste feedback, drink preparation speed, and repeat purchase rate.',
        required_docs: [],
        sub_steps: [
          { id: 'c7', title: 'Offer sample cold brew tasting shots to passersby', completed: false },
          { id: 'c8', title: 'Collect 20 customer feedback reviews on sweetness and roast', completed: false },
        ],
      },
    ],
  },
  {
    name: 'Barangay Sari-Sari Store Launch',
    type: 'Retail & Store',
    location: 'Cavite, Philippines',
    summary: 'Essential regulatory, inventory sourcing, and cash float roadmap for starting an organized neighborhood sari-sari store.',
    tasks: [
      {
        title: 'DTI Business Name & Barangay Store Clearance',
        category: 'Permits',
        status: 'Pending' as const,
        agency: 'DTI BNRS & Barangay Hall',
        estimated_time: '1 - 2 Days',
        estimated_cost: '₱750',
        desc: 'Register unique sari-sari store trade name under Sole Proprietorship at DTI online portal and secure Barangay clearance.',
        required_docs: ['2 Valid Government IDs', 'Barangay Certificate'],
        sub_steps: [
          { id: 's1', title: 'Register trade name on bnrs.dti.gov.ph', completed: false },
          { id: 's2', title: 'Apply for residential store Barangay clearance', completed: false },
        ],
      },
      {
        title: 'Wholesale FMCG & Direct Distributor Supplier Setup',
        category: 'Supplies',
        status: 'Pending' as const,
        agency: 'Wholesale Grocery Hub / Puregold / Super 8',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱15,000 - ₱25,000 initial stock',
        desc: 'Procure fast-moving consumer goods (rice, canned goods, instant noodles, hygiene sachets) at wholesale price tiers.',
        required_docs: ['DTI Certificate', 'Valid ID'],
        sub_steps: [
          { id: 's3', title: 'Register for wholesale loyalty membership card', completed: false },
          { id: 's4', title: 'Canvass rice prices across 2 public market grains dealers', completed: false },
        ],
      },
      {
        title: 'Cash Float & Digital Payments (GCash / Maya QR)',
        category: 'Finance',
        status: 'Pending' as const,
        agency: 'GCash / Maya Business',
        estimated_time: '1 Day',
        estimated_cost: '₱2,000 small bills & coins float',
        desc: 'Prepare coin rolls and small denominations, and display printout QR Ph code for cashless customer payments.',
        required_docs: ['DTI Certificate', 'Bank Account / E-Wallet'],
        sub_steps: [
          { id: 's5', title: 'Generate and laminate QR Ph payment merchant code', completed: false },
          { id: 's6', title: 'Separate daily personal cash from store capital box', completed: false },
        ],
      },
    ],
  },
];

export default function CommunityRoadmaps() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Preview Modal
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);

  // Form / Builder Modal
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Food & Beverage');
  const [location, setLocation] = useState('Metro Manila, Philippines');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('LikhAI Verified Admin');
  const [templateTasks, setTemplateTasks] = useState<RoadmapTask[]>([]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await fetchCommunityPosts();
    if (!error && data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const businessTypes = useMemo(() => {
    return Array.from(new Set(posts.map((p) => p.business_type).filter(Boolean)));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return posts.filter((p) => {
      const matchSearch =
        !q ||
        p.business_name?.toLowerCase().includes(q) ||
        p.business_type?.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q);

      const matchType = typeFilter === 'all' || p.business_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [posts, searchQuery, typeFilter]);

  const ROADMAP_PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ROADMAP_PAGE_SIZE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * ROADMAP_PAGE_SIZE;
    return filteredPosts.slice(start, start + ROADMAP_PAGE_SIZE);
  }, [filteredPosts, currentPage]);

  const handleOpenCreate = () => {
    setEditingPost(null);
    setBusinessName('');
    setBusinessType('Food & Beverage');
    setLocation('Metro Manila, Philippines');
    setSummary('');
    setImageUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80');
    setAuthorName('LikhAI Verified Admin');
    setTemplateTasks([
      {
        title: 'Initial Market Research & Business Naming',
        category: 'Research',
        status: 'Pending',
        agency: 'Self-managed',
        estimated_time: '2 - 3 Days',
        estimated_cost: 'Free',
        desc: 'Verify local demand and establish unique brand identity.',
        sub_steps: [{ id: 's1', title: 'Survey target customer base', completed: false }],
        required_docs: [],
      },
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (post: CommunityPost) => {
    setEditingPost(post);
    setBusinessName(post.business_name);
    setBusinessType(post.business_type || 'General');
    setLocation(post.location || 'Metro Manila');
    setSummary(post.summary || '');
    setImageUrl(post.image_url || '');
    setAuthorName(post.author_name || 'LikhAI Admin');
    setTemplateTasks(post.template_data || []);
    setShowModal(true);
  };

  const handleApplyPreset = (preset: (typeof STARTER_PRESETS)[0]) => {
    setBusinessName(preset.name);
    setBusinessType(preset.type);
    setLocation(preset.location);
    setSummary(preset.summary);
    setTemplateTasks(preset.tasks);
  };

  const handleAddTask = () => {
    setTemplateTasks([
      ...templateTasks,
      {
        title: `Milestone Step ${templateTasks.length + 1}`,
        category: 'Operations',
        status: 'Pending',
        agency: 'Local LGU / Agency',
        estimated_time: '1 Week',
        estimated_cost: '₱1,000',
        desc: 'Detail guidance for this operational milestone.',
        sub_steps: [{ id: `step-${Date.now()}`, title: 'Complete prerequisite checklist item', completed: false }],
        required_docs: [],
      },
    ]);
  };

  const handleRemoveTask = (index: number) => {
    setTemplateTasks(templateTasks.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index: number, field: keyof RoadmapTask, value: any) => {
    const updated = [...templateTasks];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateTasks(updated);
  };

  const handleAddSubStep = (taskIndex: number) => {
    const updated = [...templateTasks];
    const subSteps = updated[taskIndex].sub_steps || [];
    updated[taskIndex].sub_steps = [
      ...subSteps,
      { id: `sub-${Date.now()}`, title: 'New action item', completed: false },
    ];
    setTemplateTasks(updated);
  };

  const handleRemoveSubStep = (taskIndex: number, subIndex: number) => {
    const updated = [...templateTasks];
    const subSteps = updated[taskIndex].sub_steps || [];
    updated[taskIndex].sub_steps = subSteps.filter((_, i) => i !== subIndex);
    setTemplateTasks(updated);
  };

  const handleSubStepTitleChange = (taskIndex: number, subIndex: number, text: string) => {
    const updated = [...templateTasks];
    const subSteps = [...(updated[taskIndex].sub_steps || [])];
    subSteps[subIndex] = { ...subSteps[subIndex], title: text };
    updated[taskIndex].sub_steps = subSteps;
    setTemplateTasks(updated);
  };

  const handleSave = async () => {
    if (!user || !businessName.trim()) return;
    if (templateTasks.length === 0) {
      alert('Please add at least one roadmap step before publishing.');
      return;
    }

    setSaving(true);
    if (editingPost) {
      const { error } = await updateCommunityPost(
        editingPost.id,
        {
          business_name: businessName,
          business_type: businessType,
          location,
          summary,
          image_url: imageUrl,
          author_name: authorName,
          template_data: templateTasks,
        },
        user.uid
      );
      if (error) setNotice(`Could not update: ${error.message}`);
      else setNotice(`Updated community roadmap "${businessName}".`);
    } else {
      const { error } = await createCommunityPost(
        {
          author_id: user.uid,
          author_name: authorName,
          business_name: businessName,
          business_type: businessType,
          location,
          summary,
          image_url: imageUrl,
          template_data: templateTasks,
        },
        user.uid
      );
      if (error) setNotice(`Could not publish: ${error.message}`);
      else setNotice(`Published community roadmap "${businessName}". It is now live in the mobile app!`);
    }

    setSaving(false);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!user) return;
    if (!confirm(`Delete "${post.business_name}" from the Community tab? Mobile users will no longer see this template.`)) return;
    const { error } = await deleteCommunityPost(post.id, user.uid);
    if (error) setNotice(`Could not delete: ${error.message}`);
    else setNotice(`Deleted community roadmap "${post.business_name}".`);
    loadData();
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1320]">
            Community Roadmaps & Templates
          </h1>
          <p className="text-sm text-[#6E5D70] mt-1.5">
            Publish verified Philippine MSME roadmap templates directly to the mobile app's Community tab.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-[#42143E] hover:bg-[#310E2E] active:scale-[0.99] text-white font-semibold rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(66,20,62,0.2)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Community Roadmap</span>
        </button>
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

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center font-bold text-base mb-3 animate-pulse">
            <Compass className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#1E1320]">Loading community roadmaps…</p>
          <p className="text-xs text-[#6E5D70] mt-1">Fetching live public templates</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1320]">No community roadmaps found</h3>
          <p className="text-sm text-[#6E5D70] mt-1 max-w-sm mx-auto">
            Publish your first verified roadmap so mobile entrepreneurs can import it.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 bg-[#42143E] text-white font-semibold rounded-xl px-4 py-2 text-xs cursor-pointer shadow-sm"
          >
            + Create First Roadmap
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)]">
          {/* Top Filter Bar */}
          <div className="p-4 border-b border-[#F1ECF2] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search templates by business name, type, or location..."
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
              {businessTypes.length > 0 && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E] cursor-pointer"
                >
                  <option value="all">All Industries</option>
                  {businessTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              <div className="text-xs text-[#6E5D70] font-medium hidden sm:block">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'template' : 'templates'}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#6E5D70] bg-[#FAF8FB] border-b border-[#EFEAEF]">
                  <th className="px-6 py-4">Roadmap & Business</th>
                  <th className="px-6 py-4">Industry / Category</th>
                  <th className="px-6 py-4">Steps</th>
                  <th className="px-6 py-4">Author & Location</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFF5]">
                {paginatedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-[#1E1320]">No roadmaps match your filter</p>
                      <button
                        onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                        className="mt-2 text-xs font-semibold text-[#42143E] underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedPosts.map((post) => {
                    const taskCount = post.template_data?.length || 0;
                    return (
                      <tr key={post.id} className="hover:bg-[#FAF8FC] transition-colors">
                        {/* Title & Summary */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F6F3F7] border border-[#E6DEE8] flex items-center justify-center text-[#42143E] shrink-0 overflow-hidden">
                              {post.image_url ? (
                                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Compass className="w-5 h-5 text-[#42143E]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1E1320] leading-tight">{post.business_name}</p>
                              <p className="text-xs text-[#6E5D70] line-clamp-1 mt-0.5" title={post.summary}>
                                {post.summary || 'Verified Philippine MSME launch template.'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="bg-[#F6F3F7] text-[#42143E] border border-[#E6DEE8] rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center">
                            {post.business_type || 'General'}
                          </span>
                        </td>

                        {/* Steps */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
                            <ListChecks className="w-3.5 h-3.5" />
                            <span>{taskCount} {taskCount === 1 ? 'Step' : 'Steps'}</span>
                          </span>
                        </td>

                        {/* Author & Location */}
                        <td className="px-6 py-4 text-xs text-[#5A4B5C]">
                          <p className="font-medium text-[#1E1320]">{post.author_name || 'Admin'}</p>
                          <div className="flex items-center gap-1 text-[#8C7A8E] mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{post.location || 'Philippines'}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPreviewPost(post)}
                              title="Preview Roadmap Steps"
                              className="bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#42143E] font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(post)}
                              title="Edit Roadmap Details"
                              className="bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#42143E] font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(post)}
                              title="Delete from Community"
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
          {filteredPosts.length > 0 && (
            <div className="p-4 bg-white border-t border-[#F1ECF2] flex items-center justify-between text-xs text-[#6E5D70]">
              <div>
                Showing page <span className="font-semibold text-[#1E1320]">{currentPage}</span> of{' '}
                <span className="font-semibold text-[#1E1320]">{totalPages}</span> ({filteredPosts.length} total roadmaps)
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

      {/* Step Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[22px] shadow-2xl border border-[#E6DEE8] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#F1ECF2] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#F6F3F7] text-[#42143E] border border-[#E6DEE8]">
                  {previewPost.business_type}
                </span>
                <h2 className="text-xl font-bold text-[#1E1320] mt-1.5">{previewPost.business_name}</h2>
                <p className="text-xs text-[#6E5D70] mt-0.5">{previewPost.summary}</p>
              </div>
              <button
                onClick={() => setPreviewPost(null)}
                className="p-1.5 rounded-lg text-[#8C7A8E] hover:text-[#1E1320] hover:bg-[#F6F3F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5D70]">
                Curated Step-by-Step Stepper ({previewPost.template_data?.length || 0} Steps)
              </h3>

              {previewPost.template_data?.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#EAE4EC] bg-[#FAF8FA]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#42143E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm text-[#1E1320]">{step.title}</h4>
                        <p className="text-xs text-[#5A4B5C] mt-1">{step.desc}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white border border-[#E6DEE8] text-[#42143E] shrink-0">
                      {step.category}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#EFEAEF] text-xs text-[#6E5D70]">
                    {step.agency && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#8C7A8E]" />
                        <span>{step.agency}</span>
                      </div>
                    )}
                    {step.estimated_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#8C7A8E]" />
                        <span>{step.estimated_time}</span>
                      </div>
                    )}
                    {step.estimated_cost && (
                      <div className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-[#8C7A8E]" />
                        <span>{step.estimated_cost}</span>
                      </div>
                    )}
                  </div>

                  {/* Sub-steps */}
                  {step.sub_steps && step.sub_steps.length > 0 && (
                    <div className="mt-3 pl-8 space-y-1.5">
                      {step.sub_steps.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2 text-xs text-[#5A4B5C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A8E]"></span>
                          <span>{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#F1ECF2] bg-[#FAF8FA] flex justify-end">
              <button
                onClick={() => setPreviewPost(null)}
                className="px-4 py-2 rounded-xl bg-[#42143E] text-white font-medium text-xs cursor-pointer shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[22px] shadow-2xl border border-[#E6DEE8] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#F1ECF2] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1E1320]">
                  {editingPost ? 'Edit Community Roadmap' : 'Publish Community Roadmap'}
                </h2>
                <p className="text-xs text-[#6E5D70] mt-0.5">
                  This roadmap will be immediately discoverable in the mobile app's Community tab.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#8C7A8E] hover:text-[#1E1320] hover:bg-[#F6F3F7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Presets quick load */}
              {!editingPost && (
                <div className="p-4 rounded-xl bg-[#FAF6FB] border border-[#E8DCEB]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#42143E] mb-2">
                    <Sparkles className="w-4 h-4 text-[#42143E]" />
                    <span>Quick-Load Verified Starter Template</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STARTER_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#E6DEE8] text-[#1E1320] hover:border-[#42143E] hover:text-[#42143E] transition-all cursor-pointer shadow-xs"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1320] mb-1">Business Name / Title *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Specialty Milk Tea Bar"
                    className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1320] mb-1">Industry / Business Type *</label>
                  <input
                    type="text"
                    required
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="e.g. Food & Beverage, Retail, Services"
                    className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1320] mb-1">Location Label</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Metro Manila, Philippines"
                    className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1320] mb-1">Author / Curated By</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. LikhAI Verified Admin"
                    className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Summary / Guide Description *</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Provide an overview of this roadmap and who it is tailored for..."
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1320] mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                />
              </div>

              {/* Step Builder */}
              <div className="pt-3 border-t border-[#F1ECF2]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1320]">
                      Roadmap Step Builder ({templateTasks.length} Steps)
                    </h3>
                    <p className="text-xs text-[#6E5D70]">
                      Add sequential milestones for aspiring entrepreneurs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-3 py-1.5 rounded-lg bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#42143E] font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {templateTasks.map((t, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#42143E] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={t.title}
                          onChange={(e) => handleTaskChange(idx, 'title', e.target.value)}
                          placeholder="Milestone title..."
                          className="flex-1 font-semibold text-sm px-3 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320] outline-none focus:border-[#42143E]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Remove Step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-[#6E5D70] mb-1">Category</label>
                          <input
                            type="text"
                            value={t.category}
                            onChange={(e) => handleTaskChange(idx, 'category', e.target.value)}
                            placeholder="Permits, Research, Finance..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#6E5D70] mb-1">Agency</label>
                          <input
                            type="text"
                            value={t.agency || ''}
                            onChange={(e) => handleTaskChange(idx, 'agency', e.target.value)}
                            placeholder="DTI, Barangay, BIR..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#6E5D70] mb-1">Estimated Cost / Time</label>
                          <input
                            type="text"
                            value={t.estimated_cost || ''}
                            onChange={(e) => handleTaskChange(idx, 'estimated_cost', e.target.value)}
                            placeholder="₱500 / 2 Days"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#6E5D70] mb-1">Step Guidance Description</label>
                        <textarea
                          rows={2}
                          value={t.desc || ''}
                          onChange={(e) => handleTaskChange(idx, 'desc', e.target.value)}
                          placeholder="Explanation of what the user needs to do..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320]"
                        />
                      </div>

                      {/* Sub-steps */}
                      <div className="pt-2 border-t border-[#EFEAEF]">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-[#6E5D70]">
                            Action Sub-Steps Checklist ({t.sub_steps?.length || 0})
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddSubStep(idx)}
                            className="text-[11px] font-semibold text-[#42143E] hover:underline cursor-pointer"
                          >
                            + Add Action Item
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {t.sub_steps?.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A8E]"></span>
                              <input
                                type="text"
                                value={sub.title}
                                onChange={(e) => handleSubStepTitleChange(idx, sIdx, e.target.value)}
                                className="flex-1 text-xs px-2 py-1 rounded border border-[#E6DEE8] bg-white text-[#1E1320]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSubStep(idx, sIdx)}
                                className="text-neutral-400 hover:text-rose-500 p-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#F1ECF2] bg-[#FAF8FA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E6DEE8] bg-white text-[#1E1320] font-semibold text-xs hover:bg-[#F6F3F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !businessName.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Publishing…' : editingPost ? 'Update Roadmap' : 'Publish to Mobile App'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
