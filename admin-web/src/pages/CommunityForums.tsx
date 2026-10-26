import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchForumPosts,
  createForumPost,
  deleteForumPost,
  fetchForumReplies,
  createForumReply,
  deleteForumReply,
  broadcastNotificationToAllUsers,
  type ForumPost,
  type ForumReply,
} from '../lib/supabase';
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Pin,
  Send,
  X,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Bell,
  Tag,
} from 'lucide-react';

const DEFAULT_TOPICS = [
  'All Topics',
  'Taxes & BIR',
  'Permits & LGU',
  'Capital & Pricing',
  'Suppliers & Stock',
  'Customers & Sales',
];

const FORUM_PAGE_SIZE = 6;

export default function CommunityForums() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic Custom Topics
  const [customTopics, setCustomTopics] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('likhai_admin_custom_topics');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');

  // Thread detail view & replies
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // New Post Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('Permits & LGU');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newStatutory, setNewStatutory] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [savingPost, setSavingPost] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await fetchForumPosts();
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Combined Unique Topics
  const allTopics = useMemo(() => {
    const list = [...DEFAULT_TOPICS];
    posts.forEach((p) => {
      if (p.topic && !list.includes(p.topic)) {
        list.push(p.topic);
      }
    });
    customTopics.forEach((t) => {
      if (!list.includes(t)) list.push(t);
    });
    return list;
  }, [posts, customTopics]);

  const handleAddNewTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (!customTopics.includes(trimmed)) {
      const updated = [...customTopics, trimmed];
      setCustomTopics(updated);
      try {
        localStorage.setItem('likhai_admin_custom_topics', JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage save error:', e);
      }
      setNotice(`Created new forum topic "${trimmed}". Mobile users will also see this in their filter chips.`);
    }
    setSelectedTopic(trimmed);
    setNewTopicInput('');
    setShowAddTopicModal(false);
  };

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return posts.filter((p) => {
      const matchSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.author_name?.toLowerCase().includes(q);

      const matchTopic = selectedTopic === 'All Topics' || p.topic === selectedTopic;
      return matchSearch && matchTopic;
    });
  }, [posts, searchQuery, selectedTopic]);

  // Reset page when search or topic changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / FORUM_PAGE_SIZE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * FORUM_PAGE_SIZE;
    return filteredPosts.slice(start, start + FORUM_PAGE_SIZE);
  }, [filteredPosts, currentPage]);

  const handleOpenPost = async (post: ForumPost) => {
    setActivePost(post);
    setLoadingReplies(true);
    const { data } = await fetchForumReplies(post.id);
    setReplies(data || []);
    setLoadingReplies(false);
  };

  const handleCreateReply = async () => {
    if (!user || !activePost || !replyInput.trim()) return;
    setSubmittingReply(true);

    const { data, error } = await createForumReply(
      activePost.id,
      replyInput.trim(),
      user.uid,
      'LikhAI Verified Admin'
    );

    if (error) {
      setNotice(`Error posting reply: ${error.message}`);
    } else if (data) {
      setReplies([...replies, data]);
      setReplyInput('');
      setNotice('Posted official verified admin response.');
    }
    setSubmittingReply(false);
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return;
    if (!confirm('Delete this forum response?')) return;
    const { error } = await deleteForumReply(replyId, user.uid);
    if (!error) {
      setReplies(replies.filter((r) => r.id !== replyId));
      setNotice('Deleted response.');
    }
  };

  const handleDeletePost = async (post: ForumPost) => {
    if (!user) return;
    if (!confirm(`Delete discussion "${post.title}"? This cannot be undone.`)) return;
    const { error } = await deleteForumPost(post.id, user.uid);
    if (!error) {
      setPosts(posts.filter((p) => p.id !== post.id));
      if (activePost?.id === post.id) setActivePost(null);
      setNotice(`Moderated and removed "${post.title}".`);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;
    setSavingPost(true);

    const finalTopic = isCustomCategory && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : newTopic;

    // Automatically persist custom category if entered
    if (isCustomCategory && customCategoryInput.trim() && !customTopics.includes(customCategoryInput.trim())) {
      const updated = [...customTopics, customCategoryInput.trim()];
      setCustomTopics(updated);
      try {
        localStorage.setItem('likhai_admin_custom_topics', JSON.stringify(updated));
      } catch {}
    }

    const { error } = await createForumPost(
      {
        author_id: user.uid,
        author_name: 'LikhAI Official Admin',
        topic: finalTopic,
        title: newTitle,
        content: newContent,
        statutory_ref: newStatutory,
        is_pinned: newPinned,
      },
      user.uid
    );

    if (error) {
      setNotice(`Could not publish advisory: ${error.message}`);
    } else {
      if (notifyUsers) {
        await broadcastNotificationToAllUsers(
          `Official Advisory: ${newTitle}`,
          `New admin advisory in ${finalTopic}: "${newContent.slice(0, 120)}${newContent.length > 120 ? '...' : ''}"`,
          user.uid,
          'community_announcement'
        );
        setNotice(`Published community advisory "${newTitle}" and broadcasted real-time notification to all registered founders.`);
      } else {
        setNotice(`Published community advisory "${newTitle}". Live in mobile Kapihan Forum.`);
      }
      setShowNewModal(false);
      setNewTitle('');
      setNewContent('');
      setNewStatutory('');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      loadPosts();
    }
    setSavingPost(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1320]">
            Community Forums & Kapihan Q&A
          </h1>
          <p className="text-sm text-[#6E5D70] mt-1.5">
            Participate in entrepreneur discussions, address concerns with official statutory guidance, add custom topics, and moderate threads.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddTopicModal(true)}
            className="bg-white border border-[#E6DEE8] hover:bg-[#FAF8FA] text-[#42143E] font-semibold rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer shadow-xs shrink-0"
          >
            <Tag className="w-4 h-4 text-[#42143E]" />
            <span>+ Add New Topic</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-[#42143E] hover:bg-[#310E2E] active:scale-[0.99] text-white font-semibold rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(66,20,62,0.2)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Post Official Advisory</span>
          </button>
        </div>
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

      {/* Topics Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {allTopics.map((topic) => {
          const isActive = selectedTopic === topic;
          return (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#42143E] text-white shadow-xs'
                  : 'bg-white border border-[#E6DEE8] text-[#6E5D70] hover:text-[#1E1320] hover:bg-[#F6F3F7]'
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>

      {/* Two Column Layout: Thread List + Active Discussion View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thread List with Container Pagination */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] flex flex-col">
            <div className="p-4 border-b border-[#F1ECF2] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search forum questions & topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] text-[#1E1320] placeholder-[#8C7A8E] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F3EFF5] min-h-[380px]">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#6E5D70]">Loading community discussions…</div>
              ) : paginatedPosts.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6E5D70]">
                  No forum threads found under this topic.
                </div>
              ) : (
                paginatedPosts.map((post) => {
                  const isSelected = activePost?.id === post.id;
                  return (
                    <div
                      key={post.id}
                      onClick={() => handleOpenPost(post)}
                      className={`p-4 transition-all cursor-pointer space-y-2 ${
                        isSelected ? 'bg-[#F6F3F7] border-l-4 border-l-[#42143E]' : 'hover:bg-[#FAF8FC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-[#E6DEE8] text-[#42143E]">
                          {post.topic}
                        </span>
                        {post.is_pinned && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Pin className="w-2.5 h-2.5" />
                            <span>Pinned</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-xs text-[#1E1320] leading-snug line-clamp-2">
                        {post.title}
                      </h4>

                      <p className="text-[11px] text-[#6E5D70] line-clamp-2">{post.content}</p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-[#8C7A8E]">
                        <span>{post.author_name || 'Member'}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Container Pagination Controls */}
            {filteredPosts.length > 0 && (
              <div className="p-3.5 bg-white border-t border-[#F1ECF2] flex items-center justify-between text-xs text-[#6E5D70]">
                <span>
                  Page {currentPage} of {totalPages} ({filteredPosts.length} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#E6DEE8] bg-white text-[#1E1320] disabled:opacity-40 hover:bg-[#FAF8FA] cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-[#1E1320] px-1">{currentPage}</span>
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
        </div>

        {/* Active Thread & Replies Drawer */}
        <div className="lg:col-span-7">
          {activePost ? (
            <div className="bg-white rounded-[22px] overflow-hidden border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-6 space-y-6">
              {/* Thread Header */}
              <div className="pb-4 border-b border-[#F1ECF2] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F6F3F7] text-[#42143E] border border-[#E6DEE8]">
                    {activePost.topic}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeletePost(activePost)}
                      className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Moderate / Delete</span>
                    </button>
                    <button
                      onClick={() => setActivePost(null)}
                      className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-[#1E1320] leading-snug">{activePost.title}</h2>

                <div className="flex items-center gap-2 text-xs text-[#6E5D70]">
                  <span className="font-semibold text-[#1E1320]">{activePost.author_name}</span>
                  <span>•</span>
                  <span>{activePost.business_type}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#8C7A8E]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(activePost.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8FA] border border-[#E6DEE8] text-xs text-[#1E1320] leading-relaxed whitespace-pre-wrap">
                  {activePost.content}
                </div>

                {activePost.statutory_ref && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Statutory Reference: </span>
                      <span>{activePost.statutory_ref}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Replies Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5D70]">
                  Responses & Guidance ({replies.length})
                </h3>

                {loadingReplies ? (
                  <div className="p-6 text-center text-xs text-[#6E5D70]">Loading discussion replies…</div>
                ) : replies.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#E6DEE8] rounded-xl text-xs text-[#6E5D70]">
                    No responses to this topic yet. Be the first to provide verified guidance below.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies.map((reply) => {
                      const isAdmin = reply.author_role === 'admin';
                      return (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-xl border transition-all space-y-2 ${
                            isAdmin
                              ? 'bg-[#FAF6FB] border-[#E8DCEB]'
                              : 'bg-white border-[#E6DEE8]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#1E1320]">
                                {reply.author_name}
                              </span>
                              {isAdmin && (
                                <span className="text-[10px] font-bold text-[#42143E] bg-[#EAE2EC] px-2 py-0.5 rounded-full border border-[#D5C2D7]">
                                  Official Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#8C7A8E]">
                                {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => handleDeleteReply(reply.id)}
                                className="text-neutral-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Delete response"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[#1E1320] leading-relaxed whitespace-pre-wrap">
                            {reply.reply_text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply Input Box */}
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-semibold text-[#1E1320]">
                    Respond as LikhAI Official Admin
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Add authoritative Philippine regulatory guidance or MSME best practice..."
                      className="flex-1 rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] p-3 text-xs text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E] transition-all"
                    />
                    <button
                      onClick={handleCreateReply}
                      disabled={submittingReply || !replyInput.trim()}
                      className="px-4 bg-[#42143E] hover:bg-[#310E2E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingReply ? 'Posting…' : 'Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[22px] border border-[rgba(66,20,62,0.08)] shadow-[0_8px_24px_-4px_rgba(30,19,32,0.04)] p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F6F3F7] text-[#42143E] flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1E1320]">Select a forum thread</h3>
              <p className="text-sm text-[#6E5D70] mt-1 max-w-sm mx-auto">
                Click on any question from the left panel to inspect founder worries, statutory AI advice, and post official admin guidance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Topic Modal */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E6DEE8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF6FB] text-[#42143E] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E1320]">Add New Forum Topic</h3>
                  <p className="text-xs text-[#6E5D70]">Creates a new discussion category across web and mobile.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTopicModal(false)}
                className="text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Topic / Category Name *</label>
              <input
                type="text"
                autoFocus
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                placeholder="e.g. Logistics & Delivery, E-Commerce, Barangay Grants"
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2.5 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
              <p className="text-[11px] text-[#8C7A8E] mt-1.5">
                New topics will immediately appear in the admin filter bar and in mobile app filter chips for Filipino founders.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1ECF2]">
              <button
                type="button"
                onClick={() => setShowAddTopicModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6DEE8] bg-white text-xs font-semibold text-[#1E1320] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewTopic}
                disabled={!newTopicInput.trim()}
                className="px-5 py-2 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Advisory Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-[#E6DEE8] space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1ECF2]">
              <div>
                <h3 className="text-lg font-bold text-[#1E1320]">Post Official Community Advisory</h3>
                <p className="text-xs text-[#6E5D70]">
                  Creates an authoritative guidance thread published directly to the mobile Kapihan Forum.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#8C7A8E] hover:text-[#1E1320] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#1E1320]">Topic / Category *</label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[11px] text-[#42143E] hover:underline font-semibold cursor-pointer"
                >
                  {isCustomCategory ? '← Choose Existing Topic' : '+ Type Custom Category'}
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="e.g. Export & Customs, Franchise Rules, SSS/PhilHealth"
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-xs text-[#1E1320] outline-none focus:border-[#42143E]"
                />
              ) : (
                <select
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-xs text-[#1E1320] outline-none focus:border-[#42143E]"
                >
                  {allTopics.filter((t) => t !== 'All Topics').map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Advisory Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 2026 Barangay Clearance Renewal Deadlines & Tips"
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-sm text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Guidance Content *</label>
              <textarea
                rows={4}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write actionable advice, common mistakes to avoid, and step-by-step procedures..."
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] p-3 text-xs text-[#1E1320] outline-none focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1320] mb-1">Statutory Basis (Optional)</label>
              <input
                type="text"
                value={newStatutory}
                onChange={(e) => setNewStatutory(e.target.value)}
                placeholder="e.g. RA 11032 Ease of Doing Business Act / DTI DAO 20-04"
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] px-3.5 py-2 text-xs text-[#1E1320]"
              />
            </div>

            {/* Checkboxes: Pin & User Notification */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyUsers"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#42143E] cursor-pointer"
                />
                <label htmlFor="notifyUsers" className="text-xs font-semibold text-[#1E1320] cursor-pointer flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#42143E]" />
                  <span>Notify all mobile users with a real-time push notification</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#42143E] cursor-pointer"
                />
                <label htmlFor="pin" className="text-xs font-semibold text-[#1E1320] cursor-pointer">
                  Pin to top of mobile Kapihan forum as Featured Advisory
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1ECF2]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6DEE8] bg-white text-xs font-semibold text-[#1E1320] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={savingPost || !newTitle.trim() || !newContent.trim()}
                className="px-5 py-2 rounded-xl bg-[#42143E] hover:bg-[#310E2E] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingPost ? 'Publishing…' : 'Publish Advisory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
