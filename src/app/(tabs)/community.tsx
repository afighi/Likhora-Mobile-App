import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Heart,
  ListChecks,
  MapPin,
  Plus,
  Store,
  Trash2,
  UserRound,
  Users,
  ShoppingBag,
  Coffee,
  Sparkles,
  Phone,
  ExternalLink,
  CheckCircle2,
  ThumbsUp,
  Tag,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  MessageCircle,
  HelpCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Camera,
  ChevronDown,
  ChevronUp,
  Send,
  X,
  Star,
  Bookmark,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSavedRoadmaps,
  saveAllRoadmaps,
  setActiveRoadmapMeta,
  UserSavedRoadmap,
} from '@/services/roadmapStorage';
import { getStartupTemplateForBusinessType } from '@/services/startupTemplates';
import {
  CommunityPost,
  RoadmapTask,
  UserTemplate,
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityPosts,
  fetchFavoriteTemplateIds,
  fetchUserRoadmap,
  fetchUserTemplates,
  getSupabaseClient,
  replaceUserRoadmap,
  toggleFavoriteTemplate,
  uploadProductImage,
  SEED_COMMUNITY_POSTS,
  setCachedRoadmapTasks,
  isUuid,
} from '@/services/supabase';
import {
  BusinessShowcase,
  EntrepreneurWorry,
  WorryTopic,
  WorryReply,
  fetchBusinessShowcases,
  saveBusinessShowcase,
  toggleLikeShowcase,
  fetchLikedShowcaseIds,
  fetchEntrepreneurWorries,
  createEntrepreneurWorry,
  voteHelpfulWorry,
  fetchVotedWorryIds,
  fetchWorryReplies,
  createWorryReply,
} from '@/services/community';

const ROADMAP_COVER_PRESETS = [
  { label: 'Food & Dining', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80' },
  { label: 'Retail & Store', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80' },
  { label: 'Cafe & Bakery', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80' },
  { label: 'Pharmacy & Health', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80' },
];

const relativeTime = (date: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

interface AuthorProfileModalData {
  author_id?: string;
  author_name: string;
  author_avatar_url?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  location?: string | null;
  bio?: string | null;
  cover_image_url?: string | null;
  price_range?: string | null;
  offerings?: string[];
  contact_number?: string | null;
  social_link?: string | null;
  rating?: number | null;
  review_count?: number | null;
  is_verified?: boolean;
  roadmap_tasks?: RoadmapTask[];
  summary?: string | null;
  completed_milestones?: number;
  total_milestones?: number;
  likes_count?: number;
}

interface ShareCandidate {
  source: 'active' | 'template';
  name: string;
  businessType: string;
  imageUrl: string;
  taskCount: number;
  templateData: RoadmapTask[];
}

export default function CommunityTab() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { unreadCount } = useNotification();

  // Navigation Tab: 'market' (Facebook Page / Marketplace) | 'worries' (Kapihan Q&A) | 'roadmaps' (Templates)
  const [activeTab, setActiveTab] = useState<'market' | 'worries' | 'roadmaps'>('market');

  // ----------------------------------------------------
  // 1. Marketplace Showcase State
  // ----------------------------------------------------
  const [showcases, setShowcases] = useState<BusinessShowcase[]>([]);
  const [likedShowcaseIds, setLikedShowcaseIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);

  // Form fields for "Promote My Business"
  const [showcaseName, setShowcaseName] = useState('');
  const [showcaseType, setShowcaseType] = useState('');
  const [showcaseLocation, setShowcaseLocation] = useState('');
  const [showcaseBio, setShowcaseBio] = useState('');
  const [showcaseCoverUrl, setShowcaseCoverUrl] = useState('');
  const [showcasePriceRange, setShowcasePriceRange] = useState('');
  const [showcaseOfferings, setShowcaseOfferings] = useState('');
  const [showcaseContact, setShowcaseContact] = useState('');
  const [showcaseSocial, setShowcaseSocial] = useState('');

  // ----------------------------------------------------
  // 2. Kapihan Worries Forum State
  // ----------------------------------------------------
  const [worries, setWorries] = useState<EntrepreneurWorry[]>([]);
  const [votedWorryIds, setVotedWorryIds] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [showWorryModal, setShowWorryModal] = useState(false);
  const [submittingWorry, setSubmittingWorry] = useState(false);

  // Form fields for "Share a Worry"
  const [worryTitle, setWorryTitle] = useState('');
  const [worryTopic, setWorryTopic] = useState<WorryTopic>('Taxes & BIR');
  const [worryText, setWorryText] = useState('');

  // ----------------------------------------------------
  // 3. Roadmap Templates State (Existing Community Posts)
  // ----------------------------------------------------
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showProfile, setShowProfile] = useState<AuthorProfileModalData | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<'showcase' | 'roadmap'>('showcase');

  const [showPicker, setShowPicker] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [myTemplates, setMyTemplates] = useState<UserTemplate[]>([]);
  const [activeRoadmapTasks, setActiveRoadmapTasks] = useState<RoadmapTask[] | null>(null);
  const [shareCandidate, setShareCandidate] = useState<ShareCandidate | null>(null);
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  // Kapihan Worry Card Collapsible & Discussion States
  const [expandedWorryIds, setExpandedWorryIds] = useState<string[]>([]);
  const [expandedAdviceIds, setExpandedAdviceIds] = useState<string[]>([]);
  const [selectedWorryForReplies, setSelectedWorryForReplies] = useState<EntrepreneurWorry | null>(null);
  const [worryReplies, setWorryReplies] = useState<WorryReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // ----------------------------------------------------
  // Load All Community Data
  // ----------------------------------------------------
  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const [showcaseData, likedIds, worryData, votedIds, postsRes] = await Promise.all([
        fetchBusinessShowcases(),
        fetchLikedShowcaseIds(),
        fetchEntrepreneurWorries(),
        fetchVotedWorryIds(),
        fetchCommunityPosts(),
      ]);
      setShowcases(showcaseData);
      setLikedShowcaseIds(likedIds);
      setWorries(worryData);
      setVotedWorryIds(votedIds);
      if (postsRes?.data && postsRes.data.length > 0) {
        setPosts(postsRes.data);
      } else {
        setPosts(SEED_COMMUNITY_POSTS);
      }
    } catch (e) {
      console.warn('Error loading community data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCommunityData();
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('community-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts' },
        (payload) => {
          const post = payload.new as CommunityPost;
          setPosts((items) => (items.some((item) => item.id === post.id) ? items : [post, ...items]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }
    void fetchFavoriteTemplateIds(user.uid).then(({ data }) => setFavoriteIds(data));
  }, [user?.uid]);

  // Pre-fill "Promote My Business" form with user profile
  const handleOpenPromoteModal = () => {
    setShowcaseName(userProfile?.business_name || '');
    setShowcaseType(userProfile?.business_type || '');
    setShowcaseLocation(userProfile?.location || 'Philippines');
    setShowcaseBio('');
    setShowcaseCoverUrl('');
    setShowcasePriceRange('₱50 – ₱250');
    setShowcaseOfferings('Friendly Customer Service, Clean Facility, Cashless GCash');
    setShowcaseContact('');
    setShowcaseSocial('');
    setShowPromoteModal(true);
  };

  const handleSaveShowcase = async () => {
    if (!showcaseName.trim() || !showcaseBio.trim()) {
      Alert.alert('Incomplete details', 'Please enter your business name and a short bio/overview.');
      return;
    }
    setSavingShowcase(true);
    try {
      const offeringsArray = showcaseOfferings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await saveBusinessShowcase({
        authorId: user?.uid || 'guest-author',
        authorName: userProfile?.full_name || 'Business Founder',
        authorAvatarUrl: userProfile?.avatar_url || null,
        businessName: showcaseName.trim(),
        businessType: showcaseType.trim() || 'Micro Business',
        location: showcaseLocation.trim() || 'Philippines',
        bio: showcaseBio.trim(),
        coverImageUrl: showcaseCoverUrl.trim() || null,
        priceRange: showcasePriceRange.trim() || 'Affordable Daily Pricing',
        offerings: offeringsArray.length > 0 ? offeringsArray : ['Verified Micro-Enterprise'],
        contactNumber: showcaseContact.trim() || undefined,
        socialLink: showcaseSocial.trim() || undefined,
        isVerified: true,
      });

      setShowcases((prev) => [created, ...prev.filter((p) => p.authorId !== created.authorId)]);
      setShowPromoteModal(false);
      Alert.alert('Storefront Published! 🎉', 'Your digital business card is now live on the Community Marketplace.');
    } catch (e) {
      Alert.alert('Save error', 'Could not save your storefront. Please try again.');
    } finally {
      setSavingShowcase(false);
    }
  };

  const handleToggleLike = async (showcaseId: string) => {
    const { isLiked, newCount } = await toggleLikeShowcase(showcaseId, user?.uid || 'guest');
    setLikedShowcaseIds((prev) =>
      isLiked ? [...prev, showcaseId] : prev.filter((id) => id !== showcaseId)
    );
    setShowcases((prev) =>
      prev.map((s) => (s.id === showcaseId ? { ...s, likesCount: newCount } : s))
    );
  };

  // Submit a new worry in Kapihan Forum
  const handleSubmitWorry = async () => {
    if (!worryTitle.trim() || !worryText.trim()) {
      Alert.alert('Incomplete details', 'Please provide a title and explain what you are worried about.');
      return;
    }
    setSubmittingWorry(true);
    try {
      const created = await createEntrepreneurWorry({
        authorId: user?.uid || 'guest',
        authorName: userProfile?.full_name || 'Aspiring Founder',
        authorAvatarUrl: userProfile?.avatar_url || null,
        businessType: userProfile?.business_type || 'Micro Enterprise',
        stage: userProfile?.experience_level || 'Planning Stage',
        topic: worryTopic,
        title: worryTitle.trim(),
        worryText: worryText.trim(),
      });

      setWorries((prev) => [created, ...prev]);
      setShowWorryModal(false);
      setWorryTitle('');
      setWorryText('');
      Alert.alert('Worry Posted & Khora AI Answered! 💡', 'Khora AI has provided statutory guidance on your question.');
    } catch (e) {
      Alert.alert('Post error', 'Could not submit your worry. Please try again.');
    } finally {
      setSubmittingWorry(false);
    }
  };

  const handleVoteWorry = async (worryId: string) => {
    const { isVoted, newCount } = await voteHelpfulWorry(worryId);
    setVotedWorryIds((prev) =>
      isVoted ? [...prev, worryId] : prev.filter((id) => id !== worryId)
    );
    setWorries((prev) =>
      prev.map((w) => (w.id === worryId ? { ...w, helpfulVotes: newCount } : w))
    );
  };

  const toggleExpandWorry = (id: string) => {
    setExpandedWorryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleExpandAdvice = (id: string) => {
    setExpandedAdviceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenReplies = async (worry: EntrepreneurWorry) => {
    setSelectedWorryForReplies(worry);
    setLoadingReplies(true);
    setReplyInput('');
    try {
      const replies = await fetchWorryReplies(worry.id);
      setWorryReplies(replies);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedWorryForReplies || !replyInput.trim()) return;
    setSubmittingReply(true);
    try {
      const newReply = await createWorryReply({
        worryId: selectedWorryForReplies.id,
        authorId: user?.uid || 'guest-user',
        authorName: userProfile?.full_name || 'Fellow Founder',
        authorAvatarUrl: userProfile?.avatar_url || null,
        authorBusinessType: userProfile?.business_name
          ? `${userProfile.business_name} (${userProfile.business_type || 'MSME'})`
          : (userProfile?.business_type || 'Micro-Enterprise Owner'),
        replyText: replyInput.trim(),
      });
      setWorryReplies((prev) => [...prev, newReply]);
      setReplyInput('');

      // Update commentsCount in local worries state
      setWorries((prev) =>
        prev.map((w) =>
          w.id === selectedWorryForReplies.id
            ? { ...w, commentsCount: (w.commentsCount || 0) + 1 }
            : w
        )
      );
    } catch (e) {
      console.warn('Failed to submit reply:', e);
      Alert.alert('Error', 'Could not post your reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handlePickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo gallery access to upload a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    if (user?.uid && asset.base64) {
      setUploadingCover(true);
      try {
        const ext = asset.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
        const { url, error } = await uploadProductImage(user.uid, asset.base64, ext);
        if (url && !error) {
          setImageUrl(url);
          return;
        }
      } catch (err) {
        console.warn('Upload failed, using local URI:', err);
      } finally {
        setUploadingCover(false);
      }
    }

    setImageUrl(asset.uri);
  };

  // Contact / Message Link Helper
  const handleContactPress = (showcase: BusinessShowcase) => {
    if (showcase.contactNumber) {
      void Linking.openURL(`tel:${showcase.contactNumber}`);
    } else if (showcase.socialLink) {
      const url = showcase.socialLink.startsWith('http')
        ? showcase.socialLink
        : `https://${showcase.socialLink}`;
      void Linking.openURL(url);
    } else {
      Alert.alert(
        'Inquire with Founder',
        `Send an inquiry to ${showcase.authorName} (${showcase.businessName}) via Likhora In-App Messages.`
      );
    }
  };

  // ----------------------------------------------------
  // Template Sharing Helpers (Tab 3)
  // ----------------------------------------------------
  const openSharePicker = async () => {
    if (!user?.uid) return;
    setShowPicker(true);
    setLoadingPicker(true);
    const [templatesRes, roadmapRes] = await Promise.all([
      fetchUserTemplates(user.uid),
      fetchUserRoadmap(user.uid),
    ]);
    setMyTemplates(templatesRes.data || []);
    setActiveRoadmapTasks(roadmapRes.data || null);
    setLoadingPicker(false);
  };

  const pickActiveRoadmap = () => {
    if (!activeRoadmapTasks || activeRoadmapTasks.length === 0) {
      Alert.alert('No active roadmap yet', 'Complete onboarding or add tasks to your roadmap first.');
      return;
    }
    setShareCandidate({
      source: 'active',
      name: userProfile?.business_name || 'My business plan',
      businessType: userProfile?.business_type || 'Small business',
      imageUrl: '',
      taskCount: activeRoadmapTasks.length,
      templateData: activeRoadmapTasks,
    });
    setImageUrl('');
    setSummary('');
    setShowPicker(false);
  };

  const pickTemplate = (template: UserTemplate) => {
    setShareCandidate({
      source: 'template',
      name: template.name,
      businessType: template.business_type,
      imageUrl: template.image_url,
      taskCount: template.template_data?.length || 0,
      templateData: template.template_data,
    });
    setImageUrl(template.image_url || '');
    setSummary(template.summary || '');
    setShowPicker(false);
  };

  const publishSelected = async () => {
    if (!user?.uid || !userProfile || !shareCandidate) return;
    if (summary.trim().length < 12) {
      Alert.alert('Add a short description', 'Write at least 12 characters so other founders know why this plan is useful.');
      return;
    }
    setPublishing(true);
    const { data, error } = await createCommunityPost({
      author_id: user.uid,
      author_name: userProfile.full_name || 'Likha Community member',
      author_avatar_url: userProfile.avatar_url || null,
      business_name: shareCandidate.name,
      business_type: shareCandidate.businessType || 'Small business',
      location: userProfile.location || 'Philippines',
      summary: summary.trim(),
      image_url: imageUrl.trim(),
      template_data: shareCandidate.templateData,
    });
    setPublishing(false);
    if (error || !data) {
      Alert.alert('Could not publish', 'Please try again.');
      return;
    }
    setPosts((items) => (items.some((post) => post.id === data.id) ? items : [data, ...items]));
    setShareCandidate(null);
    setSummary('');
    setImageUrl('');
  };

  const useTemplate = (post: CommunityPost) => {
    Alert.alert(
      'Use this roadmap?',
      `This will load "${post.business_name || 'Community Template'}" (${post.template_data?.length || 0} Philippine regulatory steps) into your active Roadmap. Your current roadmap will be safely preserved so you can return to it anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Template',
          onPress: async () => {
            const uid = user?.uid || 'guest';
            const rawTasks = post.template_data || [];
            const newTasks: RoadmapTask[] = rawTasks.map((t, idx) => ({
              ...t,
              user_id: uid,
              id: isUuid(t.id) ? t.id : `task-${Date.now()}-${idx}`,
              step_order: idx + 1,
              status: 'Pending',
            }));

            // 1. Snapshot into saved roadmaps system so previous roadmaps are retained
            const existingRoadmaps = await getSavedRoadmaps();
            const roadmapId = post.id || `community-${Date.now()}`;
            const roadmapTitle = post.business_name || 'Community Template';

            const existingIdx = existingRoadmaps.findIndex(
              (r) => r.id === roadmapId || r.title.toLowerCase() === roadmapTitle.toLowerCase()
            );

            let updatedList: UserSavedRoadmap[];
            if (existingIdx !== -1) {
              // Existing roadmap found: update it or switch to it
              updatedList = [...existingRoadmaps];
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                updatedAt: new Date().toISOString(),
              };
            } else {
              const newSavedItem: UserSavedRoadmap = {
                id: roadmapId,
                title: roadmapTitle,
                businessType: post.business_type,
                tasks: newTasks,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };
              updatedList = [newSavedItem, ...existingRoadmaps];
            }

            await saveAllRoadmaps(updatedList);
            await setActiveRoadmapMeta(roadmapId, roadmapTitle);

            // 2. Immediately cache to AsyncStorage & in-memory
            await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(newTasks));
            setCachedRoadmapTasks(newTasks, uid);

            // 3. Also persist to Supabase if authenticated
            if (user?.uid) {
              void replaceUserRoadmap(user.uid, newTasks);
            }

            // 4. Confirm and navigate to Roadmap tab
            Alert.alert(
              'Roadmap Adopted! 🎉',
              `"${post.business_name}" is now your active roadmap. Your previous roadmaps are safely stored in your Roadmap Templates tab and you can switch back to them anytime!`,
              [
                {
                  text: 'View My Roadmap',
                  onPress: () => router.push('/roadmap'),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openAuthorPublicProfile = (source: {
    author_id?: string;
    authorId?: string;
    author_name?: string;
    authorName?: string;
    author_avatar_url?: string | null;
    authorAvatarUrl?: string | null;
    business_name?: string | null;
    businessName?: string | null;
    business_type?: string | null;
    businessType?: string | null;
    location?: string | null;
    bio?: string | null;
    cover_image_url?: string | null;
    coverImageUrl?: string | null;
    price_range?: string | null;
    priceRange?: string | null;
    offerings?: string[];
    contact_number?: string | null;
    contactNumber?: string | null;
    social_link?: string | null;
    socialLink?: string | null;
    rating?: number | null;
    review_count?: number | null;
    reviewCount?: number | null;
    is_verified?: boolean;
    isVerified?: boolean;
    template_data?: RoadmapTask[];
    roadmap_tasks?: RoadmapTask[];
    summary?: string | null;
    likes_count?: number;
    likesCount?: number;
  }) => {
    const authorName = source.author_name || source.authorName || 'Entrepreneur';
    const authorId = source.author_id || source.authorId;
    const businessName = source.business_name || source.businessName;

    // 1. Check if there is an existing showcase for this author
    const matchedShowcase = showcases.find(
      (s) =>
        (authorId && s.authorId === authorId) ||
        (s.authorName && s.authorName.toLowerCase() === authorName.toLowerCase()) ||
        (businessName && s.businessName && s.businessName.toLowerCase() === businessName.toLowerCase())
    );

    // 2. Check if there is an existing publicized roadmap post for this author
    const matchedPost = posts.find(
      (p) =>
        (authorId && p.author_id === authorId) ||
        (p.author_name && p.author_name.toLowerCase() === authorName.toLowerCase()) ||
        (businessName && p.business_name && p.business_name.toLowerCase() === businessName.toLowerCase())
    );

    const bType =
      source.business_type ||
      source.businessType ||
      matchedShowcase?.businessType ||
      matchedPost?.business_type ||
      'Micro-Enterprise';

    // Resolve publicized roadmap tasks only if the author has actually shared one
    let roadmapTasks = source.roadmap_tasks || source.template_data || matchedPost?.template_data || [];

    const completedCount = roadmapTasks ? roadmapTasks.filter((t) => t.status === 'Completed').length : 0;
    const totalCount = roadmapTasks ? roadmapTasks.length : 0;

    const data: AuthorProfileModalData = {
      author_id: authorId || matchedShowcase?.authorId || matchedPost?.author_id,
      author_name: authorName,
      author_avatar_url:
        source.author_avatar_url ||
        source.authorAvatarUrl ||
        matchedShowcase?.authorAvatarUrl ||
        matchedPost?.author_avatar_url,
      business_name:
        businessName ||
        matchedShowcase?.businessName ||
        matchedPost?.business_name ||
        `${authorName}'s Venture`,
      business_type: bType,
      location: source.location || matchedShowcase?.location || matchedPost?.location || 'Philippines',
      bio:
        source.bio ||
        matchedShowcase?.bio ||
        matchedPost?.summary ||
        'Dedicated Filipino micro-enterprise serving local communities with quality products and verified regulatory compliance.',
      cover_image_url:
        source.cover_image_url ||
        source.coverImageUrl ||
        matchedShowcase?.coverImageUrl ||
        matchedPost?.image_url ||
        null,
      price_range:
        source.price_range ||
        source.priceRange ||
        matchedShowcase?.priceRange ||
        'Affordable / Presyong Pang-Masa',
      offerings:
        source.offerings ||
        matchedShowcase?.offerings || ['DTI Registered', 'Barangay Micro-Business', 'Authentic Local Service'],
      contact_number:
        source.contact_number ||
        source.contactNumber ||
        matchedShowcase?.contactNumber ||
        null,
      social_link:
        source.social_link ||
        source.socialLink ||
        matchedShowcase?.socialLink ||
        null,
      rating: source.rating ?? matchedShowcase?.rating ?? 4.9,
      review_count: source.review_count ?? source.reviewCount ?? matchedShowcase?.reviewCount ?? 28,
      is_verified: source.is_verified ?? source.isVerified ?? matchedShowcase?.isVerified ?? true,
      roadmap_tasks: roadmapTasks || [],
      summary: source.summary || matchedPost?.summary || matchedShowcase?.bio || null,
      completed_milestones: completedCount,
      total_milestones: totalCount,
      likes_count: source.likes_count ?? source.likesCount ?? matchedShowcase?.likesCount ?? 15,
    };

    setProfileActiveTab('showcase');
    setShowProfile(data);
  };

  const handleAdoptPublicRoadmap = (profile: AuthorProfileModalData) => {
    if (!profile.roadmap_tasks || profile.roadmap_tasks.length === 0) {
      Alert.alert('No Roadmap', 'This business does not have a publicized roadmap available yet.');
      return;
    }

    Alert.alert(
      'Adopt this Roadmap?',
      `Load "${profile.business_name || 'Public Roadmap'}" (${profile.roadmap_tasks.length} regulatory steps) into your active Roadmap? Your previous roadmaps remain safely preserved in My Roadmaps.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adopt Roadmap',
          onPress: async () => {
            const uid = user?.uid || 'guest';
            const rawTasks = profile.roadmap_tasks || [];
            const newTasks: RoadmapTask[] = rawTasks.map((t, idx) => ({
              ...t,
              user_id: uid,
              id: isUuid(t.id) ? t.id : `task-${Date.now()}-${idx}`,
              step_order: idx + 1,
              status: 'Pending',
            }));

            // Save to saved roadmaps system
            const existingRoadmaps = await getSavedRoadmaps();
            const roadmapId = profile.author_id
              ? `roadmap-${profile.author_id}-${Date.now()}`
              : `community-${Date.now()}`;
            const roadmapTitle = profile.business_name || `${profile.author_name}'s Roadmap`;

            const currentActiveRoadmap: UserSavedRoadmap = {
              id: roadmapId,
              title: roadmapTitle,
              businessType: profile.business_type || 'Micro-Enterprise',
              location: profile.location || 'Philippines',
              tasks: newTasks,
              updatedAt: new Date().toISOString(),
              templateId: profile.business_type || undefined,
            };

            const updatedRoadmaps = [
              currentActiveRoadmap,
              ...existingRoadmaps.filter((r) => r.id !== roadmapId),
            ];

            await saveAllRoadmaps(updatedRoadmaps);
            await setActiveRoadmapMeta(roadmapId, roadmapTitle);
            await AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(newTasks));
            setCachedRoadmapTasks(newTasks, uid);

            if (user?.uid) {
              void replaceUserRoadmap(user.uid, newTasks);
            }

            setShowProfile(null);
            Alert.alert(
              'Roadmap Adopted! 🎉',
              `"${roadmapTitle}" is now your active launch roadmap. You can start working on its tasks in the Roadmap tab.`,
              [
                { text: 'Go to Roadmap', onPress: () => router.push('/roadmap') },
                { text: 'Stay Here', style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  };

  const removePost = (post: CommunityPost) => {
    Alert.alert('Delete your post?', 'This removes the shared template for everyone. Your own roadmap is unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.uid) return;
          const { error } = await deleteCommunityPost(post.id, user.uid);
          if (!error) setPosts((items) => items.filter((item) => item.id !== post.id));
        },
      },
    ]);
  };

  const toggleFavorite = async (postId: string) => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Sign in to save community templates.');
      return;
    }
    const isFavorite = favoriteIds.includes(postId);
    setFavoriteIds((items) => (isFavorite ? items.filter((id) => id !== postId) : [...items, postId]));
    const { error } = await toggleFavoriteTemplate(user.uid, postId, isFavorite);
    if (error) setFavoriteIds((items) => (isFavorite ? [...items, postId] : items.filter((id) => id !== postId)));
  };

  // Filtered Showcases
  const filteredShowcases = showcases.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.businessName.toLowerCase().includes(q) ||
      s.businessType.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.offerings.some((off) => off.toLowerCase().includes(q))
    );
  });

  // Derived dynamic topics from current worries + defaults
  const dynamicTopics = React.useMemo(() => {
    const defaultList = ['All', 'Taxes & BIR', 'Permits & LGU', 'Capital & Pricing', 'Suppliers & Stock', 'Customers & Sales'];
    const customFromPosts = worries
      .map((w) => w.topic)
      .filter((t): t is string => Boolean(t) && !defaultList.includes(t));
    return [...defaultList, ...Array.from(new Set(customFromPosts))];
  }, [worries]);

  // Filtered Worries
  const filteredWorries = worries.filter((w) => {
    if (selectedTopic === 'All') return true;
    return w.topic === selectedTopic;
  });

  const visiblePosts = showFavorites ? posts.filter((post) => favoriteIds.includes(post.id)) : posts;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {/* Notification Bell anchored at top right above title */}
        <View style={styles.topNotifBar}>
          <TouchableOpacity
            style={styles.notifIconBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Bell size={19} color={LikhoraColors.textPrimary} />
            {unreadCount > 0 && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        </View>

        {/* Title Row directly below */}
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Likha Community</Text>
          <Text style={styles.subtitle}>Promote your business & learn with Filipino entrepreneurs</Text>
        </View>

        {/* 2. Top Segmented Navigation (Facebook Page Marketplace | Kapihan Worries | Templates) */}
        <View style={styles.segmentedTrack}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'market' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('market')}
            activeOpacity={0.8}
          >
            <ShoppingBag size={14} color={activeTab === 'market' ? '#FFFFFF' : '#6E5D70'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentText, activeTab === 'market' && styles.segmentTextActive]}>Marketplace</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'worries' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('worries')}
            activeOpacity={0.8}
          >
            <Coffee size={14} color={activeTab === 'worries' ? '#FFFFFF' : '#6E5D70'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentText, activeTab === 'worries' && styles.segmentTextActive]}>Kapihan Q&A</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'roadmaps' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('roadmaps')}
            activeOpacity={0.8}
          >
            <ListChecks size={14} color={activeTab === 'roadmaps' ? '#FFFFFF' : '#6E5D70'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentText, activeTab === 'roadmaps' && styles.segmentTextActive]}>Roadmaps</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCommunityData} tintColor="#42143E" />
        }
      >
        {/* ========================================================================= */}
        {/* TAB 1: MARKETPLACE SHOWCASE ("Parang Facebook Page / Marketplace")        */}
        {/* ========================================================================= */}
        {activeTab === 'market' && (
          <View>
            {/* Compact iOS Action Card: Promote Storefront */}
            <View style={styles.compactHeroCard}>
              <View style={[styles.compactIconWrapper, { backgroundColor: '#F3EBF4' }]}>
                <Sparkles size={20} color="#42143E" />
              </View>
              <View style={styles.compactTextCol}>
                <Text style={styles.compactTitle}>Promote your business</Text>
                <Text style={styles.compactSubtitle} numberOfLines={1}>
                  Publish your digital storefront for free
                </Text>
              </View>
              <TouchableOpacity style={styles.compactActionBtn} onPress={handleOpenPromoteModal} activeOpacity={0.85}>
                <Plus size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={styles.compactActionBtnText}>Promote</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar with Filter Icon */}
            <View style={styles.searchBar}>
              <Search size={16} color="#6E5D70" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search businesses, generics, catering, services..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
                <SlidersHorizontal size={15} color="#6E5D70" />
              </TouchableOpacity>
            </View>

            {/* Section Header with 24px mt and 14px mb */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Featured Micro-Businesses ({filteredShowcases.length})</Text>
              <Text style={styles.sectionSubtitle}>Verified local Filipino enterprises</Text>
            </View>

            {/* Showcase Cards List */}
            {filteredShowcases.length === 0 ? (
              <View style={styles.emptyBox}>
                <Store size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No matching storefronts</Text>
                <Text style={styles.emptyText}>Be the first entrepreneur to showcase your store in this category!</Text>
              </View>
            ) : (
              filteredShowcases.map((showcase) => {
                const isLiked = likedShowcaseIds.includes(showcase.id);
                const visibleOfferings = showcase.offerings.slice(0, 3);
                const extraCount = showcase.offerings.length - 3;

                return (
                  <View key={showcase.id} style={styles.showcaseCard}>
                    {/* Cover Photo with Floating Green Price Badge (Tappable for Profile) */}
                    <TouchableOpacity
                      style={styles.showcaseCoverWrapper}
                      onPress={() => openAuthorPublicProfile(showcase)}
                      activeOpacity={0.9}
                    >
                      {showcase.coverImageUrl ? (
                        <Image source={{ uri: showcase.coverImageUrl }} style={styles.showcaseCover} resizeMode="cover" />
                      ) : (
                        <View style={styles.showcaseCoverPlaceholder}>
                          <Store size={32} color="#CBD5E1" />
                        </View>
                      )}
                      <View style={styles.floatingPriceBadge}>
                        <Tag size={10} color="#065F46" style={{ marginRight: 4 }} />
                        <Text style={styles.floatingPriceBadgeText}>{showcase.priceRange}</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.showcaseBody}>
                      {/* 1. Title & Metadata Block (Tappable for Full Profile & Roadmap) */}
                      <TouchableOpacity
                        style={styles.showcaseHeaderBlock}
                        onPress={() => openAuthorPublicProfile(showcase)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.showcaseTitleRow}>
                          <Text style={styles.showcaseBusinessName} numberOfLines={1}>
                            {showcase.businessName}
                          </Text>
                          {showcase.isVerified && (
                            <CheckCircle2 size={16} color="#166534" style={{ marginLeft: 6, flexShrink: 0 }} />
                          )}
                        </View>

                        {/* Row 1 (Subtitle): Category in Plum + Owner */}
                        <Text style={styles.showcaseMetaRow1} numberOfLines={1}>
                          <Text style={styles.showcaseCategoryText}>{showcase.businessType}</Text>
                          <Text style={styles.showcaseOwnerText}> • by {showcase.authorName}</Text>
                        </Text>

                        {/* Row 2 (Location): Map Pin & Address on its own dedicated line */}
                        <View style={styles.showcaseLocationRow}>
                          <MapPin size={12} color="#6E6570" style={{ marginRight: 4, flexShrink: 0 }} />
                          <Text style={styles.showcaseLocationText} numberOfLines={1}>
                            {showcase.location}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Description clamped to 2 lines */}
                      <Text style={styles.showcaseBio} numberOfLines={2}>
                        {showcase.bio}
                      </Text>

                      {/* Offerings Tags: Max 3 pills + extra count */}
                      <View style={styles.offeringsWrap}>
                        {visibleOfferings.map((tag, idx) => (
                          <View key={idx} style={styles.offeringTag}>
                            <Text style={styles.offeringTagText}>{tag}</Text>
                          </View>
                        ))}
                        {extraCount > 0 && (
                          <View style={styles.offeringTag}>
                            <Text style={styles.offeringTagText}>+{extraCount} more</Text>
                          </View>
                        )}
                      </View>

                      {/* Footer Actions */}
                      <View style={styles.showcaseFooter}>
                        <TouchableOpacity
                          style={styles.likeBtn}
                          onPress={() => handleToggleLike(showcase.id)}
                          activeOpacity={0.7}
                        >
                          <Heart
                            size={16}
                            color={isLiked ? '#DC2626' : '#6E6570'}
                            fill={isLiked ? '#DC2626' : 'transparent'}
                          />
                          <Text style={[styles.likeBtnText, isLiked && { color: '#DC2626', fontWeight: '700' }]}>
                            {showcase.likesCount}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {showcase.contactNumber ? (
                            <TouchableOpacity
                              style={styles.contactBtnOutline}
                              onPress={() => handleContactPress(showcase)}
                              activeOpacity={0.8}
                            >
                              <Phone size={13} color="#42143E" style={{ marginRight: 4 }} />
                              <Text style={styles.contactBtnOutlineText}>Call</Text>
                            </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity
                            style={styles.inquireBtn}
                            onPress={() => handleContactPress(showcase)}
                            activeOpacity={0.85}
                          >
                            <MessageCircle size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                            <Text style={styles.inquireBtnText}>Inquire</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KAPIHAN WORRIES & ADVICE FORUM ("Know aspiring owners' worries")   */}
        {/* ========================================================================= */}
        {activeTab === 'worries' && (
          <View>
            {/* Compact iOS Action Card: Ask / Share Hurdle */}
            <View style={styles.compactHeroCard}>
              <View style={[styles.compactIconWrapper, { backgroundColor: '#FBF0E6' }]}>
                <Coffee size={20} color="#8D4B0E" />
              </View>
              <View style={styles.compactTextCol}>
                <Text style={styles.compactTitle}>Ask worries, get legal clarity</Text>
                <Text style={styles.compactSubtitle} numberOfLines={1}>
                  Instant statutory advice from Khora AI
                </Text>
              </View>
              <TouchableOpacity
                style={styles.compactActionBtn}
                onPress={() => setShowWorryModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={styles.compactActionBtnText}>Ask / Share</Text>
              </TouchableOpacity>
            </View>

            {/* Topic Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicChipsScroll}>
              {dynamicTopics.map((topic) => {
                const isSelected = selectedTopic === topic;
                return (
                  <TouchableOpacity
                    key={topic}
                    style={[styles.topicChip, isSelected && styles.topicChipActive]}
                    onPress={() => setSelectedTopic(topic)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.topicChipText, isSelected && styles.topicChipTextActive]}>{topic}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Worries Feed */}
            {filteredWorries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Coffee size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No questions under this topic yet</Text>
                <Text style={styles.emptyText}>Tap "+ Ask / Share" to start the conversation.</Text>
              </View>
            ) : (
              filteredWorries.map((worry) => {
                const isVoted = votedWorryIds.includes(worry.id);
                const isExpanded = expandedWorryIds.includes(worry.id);
                const isAdviceExpanded = expandedAdviceIds.includes(worry.id);

                return (
                  <View key={worry.id} style={styles.worryCard}>
                    {/* Top Row: Author Avatar & Name (Tappable for Profile) + Topic Badge */}
                    <View style={styles.worryHeader}>
                      <TouchableOpacity
                        style={styles.worryAuthorRow}
                        onPress={() => {
                          openAuthorPublicProfile({
                            author_id: worry.authorId,
                            author_name: worry.authorName,
                            author_avatar_url: worry.authorAvatarUrl,
                            business_name: worry.businessType,
                            business_type: worry.businessType,
                            location: worry.stage,
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        {worry.authorAvatarUrl ? (
                          <Image source={{ uri: worry.authorAvatarUrl }} style={styles.worryAvatar} />
                        ) : (
                          <View style={styles.worryAvatarPlaceholder}>
                            <Text style={styles.worryAvatarInitials}>
                              {worry.authorName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.worryAuthor}>{worry.authorName}</Text>
                          <Text style={styles.worrySub}>
                            {worry.businessType} • <Text style={{ fontStyle: 'italic' }}>{worry.stage}</Text>
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>{worry.topic}</Text>
                      </View>
                    </View>

                    {/* Worry Question (Clamped with Read More / Show Less) */}
                    <View style={styles.worryQuestionBlock}>
                      <Text style={styles.worryTitle}>{worry.title}</Text>
                      <Text
                        style={styles.worryBody}
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {worry.worryText}
                      </Text>
                      {worry.worryText.length > 130 && (
                        <TouchableOpacity
                          onPress={() => toggleExpandWorry(worry.id)}
                          style={styles.readMoreBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.readMoreText}>
                            {isExpanded ? 'Show less' : 'Read full question'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Khora AI Statutory Advice Box (Collapsible / Compact) */}
                    <View style={styles.adviceBox}>
                      <TouchableOpacity
                        style={styles.adviceHeader}
                        onPress={() => toggleExpandAdvice(worry.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Sparkles size={14} color="#42143E" style={{ marginRight: 6 }} />
                          <Text style={styles.adviceTitle}>Khora AI Statutory Guidance</Text>
                        </View>
                        <View style={styles.adviceTogglePill}>
                          <Text style={styles.adviceTogglePillText}>
                            {isAdviceExpanded ? 'Collapse' : 'Legal Advice'}
                          </Text>
                          {isAdviceExpanded ? (
                            <ChevronUp size={13} color="#42143E" style={{ marginLeft: 2 }} />
                          ) : (
                            <ChevronDown size={13} color="#42143E" style={{ marginLeft: 2 }} />
                          )}
                        </View>
                      </TouchableOpacity>

                      <Text
                        style={styles.adviceText}
                        numberOfLines={isAdviceExpanded ? undefined : 2}
                      >
                        {worry.khoraAiAdvice}
                      </Text>

                      {isAdviceExpanded && worry.statutoryReference ? (
                        <View style={styles.statuteRow}>
                          <ShieldCheck size={12} color="#166534" style={{ marginRight: 5 }} />
                          <Text style={styles.statuteText}>Legal Basis: {worry.statutoryReference}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer: Helpful votes, Replies / Discussion button, and timestamp */}
                    <View style={styles.worryFooter}>
                      <View style={styles.worryFooterActions}>
                        <TouchableOpacity
                          style={[styles.helpfulBtn, isVoted && styles.helpfulBtnActive]}
                          onPress={() => handleVoteWorry(worry.id)}
                          activeOpacity={0.8}
                        >
                          <ThumbsUp size={13} color={isVoted ? '#FFFFFF' : '#42143E'} style={{ marginRight: 5 }} />
                          <Text style={[styles.helpfulBtnText, isVoted && styles.helpfulBtnTextActive]}>
                            Helpful ({worry.helpfulVotes})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.replyBtn}
                          onPress={() => handleOpenReplies(worry)}
                          activeOpacity={0.8}
                        >
                          <MessageCircle size={13} color="#42143E" style={{ marginRight: 5 }} />
                          <Text style={styles.replyBtnText}>
                            Replies ({worry.commentsCount || 0})
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.timeText}>{relativeTime(worry.createdAt)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ROADMAP TEMPLATES (Airy iOS Banner & Grouped Cards)               */}
        {/* ========================================================================= */}
        {activeTab === 'roadmaps' && (
          <View>
            {/* Compact iOS Action Card: Share a Roadmap */}
            <View style={styles.compactHeroCard}>
              <View style={[styles.compactIconWrapper, { backgroundColor: '#F3EBF4' }]}>
                <ListChecks size={20} color="#42143E" />
              </View>
              <View style={styles.compactTextCol}>
                <Text style={styles.compactTitle}>Share a business roadmap</Text>
                <Text style={styles.compactSubtitle} numberOfLines={1}>
                  Publish templates to help fellow founders
                </Text>
              </View>
              <TouchableOpacity style={styles.compactActionBtn} onPress={openSharePicker} activeOpacity={0.85}>
                <Plus size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={styles.compactActionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>{showFavorites ? 'Favorite templates' : 'Community roadmaps'}</Text>
              <TouchableOpacity
                style={[styles.favoritesToggle, showFavorites && styles.favoritesToggleActive]}
                onPress={() => setShowFavorites((value) => !value)}
                activeOpacity={0.8}
              >
                <Heart
                  size={14}
                  color={showFavorites ? '#FFFFFF' : '#42143E'}
                  fill={showFavorites ? '#FFFFFF' : 'transparent'}
                />
                <Text
                  style={[
                    styles.favoritesToggleText,
                    showFavorites && styles.favoritesToggleTextActive,
                  ]}
                >
                  {showFavorites ? 'All templates' : `Favorites (${favoriteIds.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && posts.length === 0 ? <ActivityIndicator color="#42143E" /> : null}

            {!loading && posts.length === 0 ? (
              <View style={styles.empty}>
                <BookOpen size={30} color={LikhoraColors.textPlaceholder} />
                <Text style={styles.emptyTitle}>No shared roadmaps yet</Text>
                <Text style={styles.emptyText}>Be the first founder to share a plan.</Text>
              </View>
            ) : null}

            {visiblePosts.map((post) => (
              <View key={post.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity style={styles.author} onPress={() => openAuthorPublicProfile(post)} activeOpacity={0.8}>
                    {post.author_avatar_url ? (
                      <Image source={{ uri: post.author_avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{post.author_name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.authorName}>{post.author_name}</Text>
                      <Text style={styles.time}>{relativeTime(post.created_at)}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => toggleFavorite(post.id)} activeOpacity={0.7}>
                      <Heart
                        size={19}
                        color="#42143E"
                        fill={favoriteIds.includes(post.id) ? '#42143E' : 'transparent'}
                      />
                    </TouchableOpacity>
                    {post.author_id === user?.uid ? (
                      <TouchableOpacity onPress={() => removePost(post)} activeOpacity={0.7}>
                        <Trash2 size={18} color={LikhoraColors.errorRed} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {post.image_url ? (
                  <Image source={{ uri: post.image_url }} style={styles.coverImage} resizeMode="cover" />
                ) : null}

                <View style={styles.roadmapContentBlock}>
                  <Text style={styles.businessName}>{post.business_name}</Text>
                  <View style={styles.meta}>
                    <Store size={13} color="#42143E" />
                    <Text style={styles.metaText}>{post.business_type}</Text>
                    <MapPin size={13} color="#42143E" />
                    <Text style={styles.metaText}>{post.location}</Text>
                  </View>
                  <Text style={styles.summary}>{post.summary}</Text>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{post.template_data?.length || 0} roadmap tasks</Text>
                  </View>
                  <TouchableOpacity style={styles.useButton} onPress={() => useTemplate(post)} activeOpacity={0.85}>
                    <Text style={styles.useText}>Use template</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: PROMOTE MY BUSINESS (MARKETPLACE CARD)                           */}
      {/* ========================================================================= */}
      <Modal visible={showPromoteModal} transparent animationType="slide" onRequestClose={() => setShowPromoteModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>Publish Storefront Card</Text>
            <Text style={styles.modalBody}>
              Promote your business on the Community Marketplace. Other entrepreneurs and local customers will see your business bio, price range, and offerings.
            </Text>

            <ScrollView style={{ maxHeight: 380, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Business Name</Text>
              <TextInput style={styles.inputField} value={showcaseName} onChangeText={setShowcaseName} placeholder="e.g. Aling Nena's Pharmacy" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Business Category</Text>
              <TextInput style={styles.inputField} value={showcaseType} onChangeText={setShowcaseType} placeholder="e.g. Pharmacy / Drugstore" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Barangay & City Location</Text>
              <TextInput style={styles.inputField} value={showcaseLocation} onChangeText={setShowcaseLocation} placeholder="e.g. Brgy. Owaog-Nebloc, Botolan" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Price Range / Starting Budget</Text>
              <TextInput style={styles.inputField} value={showcasePriceRange} onChangeText={setShowcasePriceRange} placeholder="e.g. ₱50 – ₱250" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Key Offerings / Services (comma-separated)</Text>
              <TextInput style={styles.inputField} value={showcaseOfferings} onChangeText={setShowcaseOfferings} placeholder="e.g. Generic Medicines, Free BP Check, Delivery" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Contact Mobile or FB Page (optional)</Text>
              <TextInput style={styles.inputField} value={showcaseContact} onChangeText={setShowcaseContact} placeholder="e.g. 0917-123-4567 or facebook.com/mybotika" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Cover Photo URL (optional)</Text>
              <TextInput style={styles.inputField} value={showcaseCoverUrl} onChangeText={setShowcaseCoverUrl} placeholder="https://..." placeholderTextColor="#94A3B8" autoCapitalize="none" />

              <Text style={styles.inputLabel}>Business Bio & Overview</Text>
              <TextInput style={[styles.inputField, { minHeight: 70, textAlignVertical: 'top' }]} value={showcaseBio} onChangeText={setShowcaseBio} multiline placeholder="Tell founders what makes your store special..." placeholderTextColor="#94A3B8" />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPromoteModal(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveShowcase} style={styles.publish} disabled={savingShowcase}>
                {savingShowcase ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Publish Card</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ASK / SHARE A WORRY (KAPIHAN FORUM)                              */}
      {/* ========================================================================= */}
      <Modal visible={showWorryModal} transparent animationType="slide" onRequestClose={() => setShowWorryModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Coffee size={20} color="#42143E" style={{ marginRight: 6 }} />
              <Text style={styles.modalTitle}>Share a Founder Worry</Text>
            </View>
            <Text style={styles.modalBody}>
              Post any question or hurdle you're worried about. Khora AI will immediately research relevant Philippine laws and provide an actionable, reassuring response.
            </Text>

            <ScrollView style={{ maxHeight: 360, marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select Worry Topic</Text>
              <View style={styles.topicSelectRow}>
                {(['Taxes & BIR', 'Permits & LGU', 'Capital & Pricing', 'Suppliers & Stock', 'Customers & Sales'] as WorryTopic[]).map(
                  (t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.topicSelectBtn, worryTopic === t && styles.topicSelectBtnActive]}
                      onPress={() => setWorryTopic(t)}
                    >
                      <Text style={[styles.topicSelectText, worryTopic === t && styles.topicSelectTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>Question or Worry Title</Text>
              <TextInput
                style={styles.inputField}
                value={worryTitle}
                onChangeText={setWorryTitle}
                placeholder="e.g. Paano po kung hindi umabot sa ₱50k ang monthly sales, magbabayad pa rin ba ng BIR?"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Details / What is holding you back?</Text>
              <TextInput
                style={[styles.inputField, { minHeight: 90, textAlignVertical: 'top' }]}
                value={worryText}
                onChangeText={setWorryText}
                multiline
                placeholder="Describe your current situation, budget, or fear in detail..."
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowWorryModal(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitWorry} style={styles.publish} disabled={submittingWorry}>
                {submittingWorry ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Get Advice</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Template Picker */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What do you want to share?</Text>
            <Text style={styles.modalBody}>Choose one of your saved templates, or your current active roadmap.</Text>

            {loadingPicker ? (
              <ActivityIndicator color="#42143E" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360, marginTop: 14 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.pickerRow} onPress={pickActiveRoadmap} activeOpacity={0.8}>
                  <View style={styles.pickerIconBadge}>
                    <ListChecks size={18} color="#42143E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowTitle}>My Active Roadmap</Text>
                    <Text style={styles.pickerRowSub}>
                      {activeRoadmapTasks ? `${activeRoadmapTasks.length} tasks` : 'Your current in-progress plan'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={LikhoraColors.textSecondary} />
                </TouchableOpacity>

                {myTemplates.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>
                      You haven't saved any custom templates yet. Build one from the Roadmap tab's "Create your own template" button.
                    </Text>
                  </View>
                ) : (
                  myTemplates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={styles.pickerRow}
                      onPress={() => pickTemplate(template)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickerIconBadge}>
                        <Store size={18} color="#42143E" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerRowTitle} numberOfLines={1}>
                          {template.name}
                        </Text>
                        <Text style={styles.pickerRowSub}>
                          {template.template_data?.length || 0} tasks
                          {template.business_type ? ` • ${template.business_type}` : ''}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={LikhoraColors.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 4: Describe & Publish chosen template */}
      <Modal visible={Boolean(shareCandidate)} transparent animationType="slide" onRequestClose={() => setShareCandidate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share “{shareCandidate?.name}”</Text>
            <Text style={styles.modalBody}>
              {shareCandidate?.taskCount} roadmap tasks will be visible to the community, along with your business name, category, location, and the summary below.
            </Text>

            {/* Modern Image Picker (Replaces raw URL string field) */}
            <View style={styles.coverPickerSection}>
              <Text style={styles.coverPickerLabel}>Cover Photo (Optional)</Text>

              {imageUrl ? (
                <View style={styles.coverPreviewContainer}>
                  <Image source={{ uri: imageUrl }} style={styles.coverPreviewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeCoverBtn}
                    onPress={() => setImageUrl('')}
                    activeOpacity={0.8}
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeCoverBtn}
                    onPress={handlePickCoverImage}
                    disabled={uploadingCover}
                    activeOpacity={0.8}
                  >
                    <Camera size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.changeCoverText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadCoverBox}
                  onPress={handlePickCoverImage}
                  disabled={uploadingCover}
                  activeOpacity={0.8}
                >
                  {uploadingCover ? (
                    <ActivityIndicator color="#42143E" />
                  ) : (
                    <>
                      <Camera size={22} color="#42143E" style={{ marginBottom: 6 }} />
                      <Text style={styles.uploadCoverText}>Upload photo from gallery</Text>
                      <Text style={styles.uploadCoverSub}>Recommended: 16:9 landscape photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Quick Presets */}
              <View style={styles.presetSection}>
                <Text style={styles.presetSectionTitle}>Or choose a category style:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                  {ROADMAP_COVER_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, imageUrl === preset.url && styles.presetChipActive]}
                      onPress={() => setImageUrl(preset.url)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: preset.url }} style={styles.presetThumb} />
                      <Text style={[styles.presetText, imageUrl === preset.url && styles.presetTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={summary}
              onChangeText={setSummary}
              multiline
              maxLength={280}
              placeholder="What did you learn or what makes this plan helpful?"
              placeholderTextColor={LikhoraColors.textPlaceholder}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShareCandidate(null)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={publishSelected} style={styles.publish} disabled={publishing}>
                {publishing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Publish</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 5: Rich Author & Public Business/Roadmap Profile */}
      <Modal
        visible={Boolean(showProfile)}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfile(null)}
      >
        <View style={styles.profileModalBackdrop}>
          <View style={styles.profileModalContainer}>
            {/* Always visible floating Close button */}
            <TouchableOpacity
              style={styles.profileCloseCircleBtn}
              onPress={() => setShowProfile(null)}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Scrollable Profile Body with Cover at top */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.profileScrollBody}
            >
              {/* 1. Hero Cover Header with Gradient */}
              <View style={styles.profileCoverHeader}>
                {showProfile?.cover_image_url ? (
                  <Image
                    source={{ uri: showProfile.cover_image_url }}
                    style={styles.profileCoverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profileCoverFallback}>
                    <Store size={48} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={styles.profileCoverOverlay} />
              </View>

              {/* 2. Overlapping Avatar & Identity Header */}
              <View style={styles.profileIdentityRow}>
                <View style={styles.profileAvatarWrapper}>
                  {showProfile?.author_avatar_url ? (
                    <Image source={{ uri: showProfile.author_avatar_url }} style={styles.profileAvatarImg} />
                  ) : (
                    <View style={styles.profileAvatarImgFallback}>
                      <Text style={styles.profileAvatarText}>
                        {(showProfile?.author_name || 'E')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {showProfile?.is_verified && (
                    <View style={styles.profileVerifiedBadge}>
                      <CheckCircle2 size={16} color="#166534" fill="#DCFCE7" />
                    </View>
                  )}
                </View>

                <View style={styles.profileIdentityTextCol}>
                  <Text style={styles.profileBusinessNameText} numberOfLines={2}>
                    {showProfile?.business_name}
                  </Text>
                  <View style={styles.profileFounderBadgeRow}>
                    <UserRound size={12} color="#6E6570" style={{ marginRight: 4 }} />
                    <Text style={styles.profileFounderNameText}>
                      Founder: <Text style={{ fontWeight: '800', color: '#1E1320' }}>{showProfile?.author_name}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Badges: Category & Location */}
              <View style={styles.profileBadgeChipsRow}>
                <View style={styles.profileCategoryPill}>
                  <Store size={12} color="#42143E" style={{ marginRight: 5 }} />
                  <Text style={styles.profileCategoryPillText}>{showProfile?.business_type}</Text>
                </View>
                <View style={styles.profileLocationPill}>
                  <MapPin size={12} color="#0369A1" style={{ marginRight: 5 }} />
                  <Text style={styles.profileLocationPillText} numberOfLines={1}>{showProfile?.location}</Text>
                </View>
              </View>

              {/* 3. Metrics Summary Bar */}
              <View style={styles.profileMetricsBar}>
                <View style={styles.profileMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={13} color="#D97706" fill="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.profileMetricValue}>{showProfile?.rating || 4.9}</Text>
                  </View>
                  <Text style={styles.profileMetricLabel}>{showProfile?.review_count || 28} Reviews</Text>
                </View>

                <View style={styles.profileMetricDivider} />

                <View style={styles.profileMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Tag size={13} color="#059669" style={{ marginRight: 3 }} />
                    <Text style={styles.profileMetricValue} numberOfLines={1}>
                      {showProfile?.price_range?.split(' ')[0] || 'Affordable'}
                    </Text>
                  </View>
                  <Text style={styles.profileMetricLabel}>Price Tier</Text>
                </View>

                <View style={styles.profileMetricDivider} />

                <View style={styles.profileMetricItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ListChecks size={13} color="#42143E" style={{ marginRight: 3 }} />
                    <Text style={styles.profileMetricValue}>
                      {showProfile?.completed_milestones || 0}/{showProfile?.total_milestones || 0}
                    </Text>
                  </View>
                  <Text style={styles.profileMetricLabel}>Milestones</Text>
                </View>
              </View>

              {/* 4. Tab Segmented Control */}
              <View style={styles.profileSegmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.profileSegmentBtn,
                    profileActiveTab === 'showcase' && styles.profileSegmentBtnActive,
                  ]}
                  onPress={() => setProfileActiveTab('showcase')}
                  activeOpacity={0.8}
                >
                  <ShoppingBag
                    size={14}
                    color={profileActiveTab === 'showcase' ? '#FFFFFF' : '#6E6570'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.profileSegmentBtnText,
                      profileActiveTab === 'showcase' && styles.profileSegmentBtnTextActive,
                    ]}
                  >
                    Business Showcase
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.profileSegmentBtn,
                    profileActiveTab === 'roadmap' && styles.profileSegmentBtnActive,
                  ]}
                  onPress={() => setProfileActiveTab('roadmap')}
                  activeOpacity={0.8}
                >
                  <ListChecks
                    size={14}
                    color={profileActiveTab === 'roadmap' ? '#FFFFFF' : '#6E6570'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.profileSegmentBtnText,
                      profileActiveTab === 'roadmap' && styles.profileSegmentBtnTextActive,
                    ]}
                  >
                    Public Roadmap
                  </Text>
                  {Boolean(showProfile?.roadmap_tasks?.length) && (
                    <View
                      style={[
                        styles.profileCountBadge,
                        profileActiveTab === 'roadmap' && { backgroundColor: '#FFFFFF' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileCountBadgeText,
                          profileActiveTab === 'roadmap' && { color: '#42143E' },
                        ]}
                      >
                        {showProfile?.roadmap_tasks?.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* 5. TAB 1: BUSINESS SHOWCASE OVERVIEW */}
              {profileActiveTab === 'showcase' && (
                <View style={styles.profileTabContent}>
                  {/* About the Business */}
                  <View style={styles.profileSectionBox}>
                    <Text style={styles.profileSectionTitle}>About This Business</Text>
                    <Text style={styles.profileBioText}>{showProfile?.bio}</Text>
                  </View>

                  {/* Specialties & Offerings */}
                  {Boolean(showProfile?.offerings?.length) && (
                    <View style={styles.profileSectionBox}>
                      <Text style={styles.profileSectionTitle}>Specialties & Highlights</Text>
                      <View style={styles.profileOfferingsGrid}>
                        {showProfile?.offerings?.map((tag, idx) => (
                          <View key={idx} style={styles.profileOfferingChip}>
                            <Sparkles size={11} color="#065F46" style={{ marginRight: 5 }} />
                            <Text style={styles.profileOfferingChipText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Contact & Storefront Row */}
                  <View style={styles.profileSectionBox}>
                    <Text style={styles.profileSectionTitle}>Storefront & Contact Details</Text>
                    
                    <View style={styles.profileContactRows}>
                      {showProfile?.contact_number ? (
                        <TouchableOpacity
                          style={styles.profileContactBtn}
                          onPress={() => Linking.openURL(`tel:${showProfile.contact_number}`)}
                          activeOpacity={0.8}
                        >
                          <Phone size={15} color="#42143E" style={{ marginRight: 8 }} />
                          <Text style={styles.profileContactBtnText}>Call {showProfile.contact_number}</Text>
                        </TouchableOpacity>
                      ) : null}

                      {showProfile?.social_link ? (
                        <TouchableOpacity
                          style={styles.profileSocialBtn}
                          onPress={() => {
                            const url = showProfile.social_link?.startsWith('http')
                              ? showProfile.social_link
                              : `https://${showProfile.social_link}`;
                            Linking.openURL(url);
                          }}
                          activeOpacity={0.8}
                        >
                          <ExternalLink size={15} color="#1D4ED8" style={{ marginRight: 8 }} />
                          <Text style={styles.profileSocialBtnText}>Visit Facebook Page</Text>
                        </TouchableOpacity>
                      ) : null}

                      <View style={styles.profileAddressCard}>
                        <MapPin size={15} color="#6E6570" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={styles.profileAddressText}>
                          Located in <Text style={{ fontWeight: '700' }}>{showProfile?.location}</Text>. Open for local patronage and orders.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* 6. TAB 2: PUBLICIZED ROADMAP JOURNEY */}
              {profileActiveTab === 'roadmap' && (
                <View style={styles.profileTabContent}>
                  {/* Progress Header */}
                  <View style={styles.roadmapHeaderCard}>
                    <View style={styles.roadmapProgressRow}>
                      <Text style={styles.roadmapProgressTitle}>Founder's Startup Milestone Progress</Text>
                      <Text style={styles.roadmapProgressPercent}>
                        {showProfile?.total_milestones
                          ? Math.round(((showProfile.completed_milestones || 0) / showProfile.total_milestones) * 100)
                          : 0}%
                      </Text>
                    </View>

                    <View style={styles.profileProgressBarTrack}>
                      <View
                        style={[
                          styles.profileProgressBarFill,
                          {
                            width: `${
                              showProfile?.total_milestones
                                ? Math.round(((showProfile.completed_milestones || 0) / showProfile.total_milestones) * 100)
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.roadmapSubNotice}>
                      Publicized launch milestones and legal permits completed by {showProfile?.author_name} to establish {showProfile?.business_name}.
                    </Text>
                  </View>

                  {/* Milestones List */}
                  {(!showProfile?.roadmap_tasks || showProfile.roadmap_tasks.length === 0) ? (
                    <View style={styles.roadmapEmptyBox}>
                      <ListChecks size={32} color="#94A3B8" />
                      <Text style={styles.roadmapEmptyText}>No publicized roadmap steps available.</Text>
                      <Text style={{ fontSize: 11, color: '#6E6570', marginTop: 4, textAlign: 'center', lineHeight: 15, fontFamily: LikhoraFont.fontFamily }}>
                        This founder has not shared a launch template or publicized roadmap to the Community Negosyo Market yet.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.roadmapTimelineList}>
                      {showProfile.roadmap_tasks.map((task, idx) => {
                        const isCompleted = task.status === 'Completed';
                        const isInProgress = task.status === 'In Progress';

                        return (
                          <View key={task.id || `task-${idx}`} style={styles.roadmapTimelineItem}>
                            <View style={styles.roadmapTimelineStepCol}>
                              <View
                                style={[
                                  styles.roadmapStepCircle,
                                  isCompleted && styles.roadmapStepCircleCompleted,
                                  isInProgress && styles.roadmapStepCircleInProgress,
                                ]}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 size={14} color="#FFFFFF" />
                                ) : (
                                  <Text
                                    style={[
                                      styles.roadmapStepCircleNum,
                                      (isCompleted || isInProgress) && { color: '#FFFFFF' },
                                    ]}
                                  >
                                    {idx + 1}
                                  </Text>
                                )}
                              </View>
                              {idx < (showProfile.roadmap_tasks?.length || 0) - 1 && (
                                <View style={styles.roadmapTimelineConnectorLine} />
                              )}
                            </View>

                            <View style={styles.roadmapTaskCard}>
                              <View style={styles.roadmapTaskTopRow}>
                                <Text style={styles.roadmapTaskTitle}>{task.title}</Text>
                                <View
                                  style={[
                                    styles.roadmapStatusPill,
                                    isCompleted && styles.roadmapStatusPillCompleted,
                                    isInProgress && styles.roadmapStatusPillInProgress,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.roadmapStatusPillText,
                                      isCompleted && { color: '#166534' },
                                      isInProgress && { color: '#92400E' },
                                    ]}
                                  >
                                    {task.status || 'Pending'}
                                  </Text>
                                </View>
                              </View>

                              {Boolean(task.desc) && (
                                <Text style={styles.roadmapTaskDesc}>{task.desc}</Text>
                              )}

                              <View style={styles.roadmapTaskMetaBadges}>
                                {Boolean(task.agency) && (
                                  <View style={styles.roadmapAgencyBadge}>
                                    <ShieldCheck size={11} color="#42143E" style={{ marginRight: 4 }} />
                                    <Text style={styles.roadmapAgencyBadgeText}>{task.agency}</Text>
                                  </View>
                                )}
                                {Boolean(task.legal_basis) && (
                                  <View style={styles.roadmapLegalBadge}>
                                    <Text style={styles.roadmapLegalBadgeText}>{task.legal_basis}</Text>
                                  </View>
                                )}
                              </View>

                              {Boolean(task.sub_steps?.length) && (
                                <View style={styles.roadmapSubStepsWrap}>
                                  {task.sub_steps?.slice(0, 3).map((sub, sIdx) => (
                                    <View key={sub.id || sIdx} style={styles.roadmapSubStepRow}>
                                      <View
                                        style={[
                                          styles.roadmapSubStepDot,
                                          sub.completed && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                                        ]}
                                      />
                                      <Text
                                        style={[
                                          styles.roadmapSubStepText,
                                          sub.completed && { color: '#1E293B', fontWeight: '600' },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {sub.title}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Action CTA: Adopt / Use This Roadmap */}
                  {Boolean(showProfile?.roadmap_tasks?.length) && (
                    <TouchableOpacity
                      style={styles.adoptRoadmapBtn}
                      onPress={() => showProfile && handleAdoptPublicRoadmap(showProfile)}
                      activeOpacity={0.88}
                    >
                      <ListChecks size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.adoptRoadmapBtnText}>
                        Adopt This Roadmap ({showProfile?.roadmap_tasks?.length} Steps)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Bottom Close Button */}
              <TouchableOpacity
                style={styles.profileBottomDismissBtn}
                onPress={() => setShowProfile(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.profileBottomDismissText}>Close Profile</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal 6: Kapihan Discussion & Replies */}
      <Modal
        visible={Boolean(selectedWorryForReplies)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWorryForReplies(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.repliesModalCard}>
            {/* Modal Header */}
            <View style={styles.repliesModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.repliesTopicBadge}>
                  <Text style={styles.repliesTopicBadgeText}>{selectedWorryForReplies?.topic}</Text>
                </View>
                <Text style={styles.repliesModalTitle} numberOfLines={2}>
                  {selectedWorryForReplies?.title}
                </Text>
                <Text style={styles.repliesModalAuthor}>
                  Asked by {selectedWorryForReplies?.authorName} • {selectedWorryForReplies?.businessType}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedWorryForReplies(null)}
                style={styles.closeRepliesBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#6E5D70" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Replies Thread */}
            <ScrollView style={styles.repliesScrollView} showsVerticalScrollIndicator={false}>
              {loadingReplies ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator color="#42143E" />
                </View>
              ) : worryReplies.length === 0 ? (
                <View style={styles.repliesEmpty}>
                  <MessageCircle size={32} color="#CBD5E1" />
                  <Text style={styles.repliesEmptyTitle}>No replies yet</Text>
                  <Text style={styles.repliesEmptyText}>
                    Be the first fellow business owner to share advice or tips!
                  </Text>
                </View>
              ) : (
                worryReplies.map((reply) => (
                  <View key={reply.id} style={styles.replyItem}>
                    <View style={styles.replyAuthorRow}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() =>
                          openAuthorPublicProfile({
                            author_id: reply.authorId,
                            author_name: reply.authorName,
                            author_avatar_url: reply.authorAvatarUrl,
                            business_type: reply.authorBusinessType,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        {reply.authorAvatarUrl ? (
                          <Image source={{ uri: reply.authorAvatarUrl }} style={styles.replyAvatar} />
                        ) : (
                          <View style={styles.replyAvatarPlaceholder}>
                            <Text style={styles.replyAvatarInitials}>
                              {reply.authorName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.replyAuthorName}>{reply.authorName}</Text>
                          {reply.authorBusinessType ? (
                            <Text style={styles.replyAuthorBusiness}>{reply.authorBusinessType}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      <Text style={styles.replyTime}>{relativeTime(reply.createdAt)}</Text>
                    </View>
                    <Text style={styles.replyBodyText}>{reply.replyText}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Reply Composer at Bottom */}
            <View style={styles.replyComposer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Share your experience or advice..."
                placeholderTextColor="#94A3B8"
                value={replyInput}
                onChangeText={setReplyInput}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={[
                  styles.sendReplyBtn,
                  (!replyInput.trim() || submittingReply) && styles.sendReplyBtnDisabled,
                ]}
                onPress={handleSendReply}
                disabled={!replyInput.trim() || submittingReply}
                activeOpacity={0.8}
              >
                {submittingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={15} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F4F8' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#F5F4F8',
  },
  topNotifBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  headerTitleRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    fontFamily: LikhoraFont.fontFamily,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  notifIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#EAE7EF',
    borderRadius: 16,
    padding: 4,
    borderWidth: 0,
    marginTop: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: '#42143E',
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 3px 8px rgba(66, 20, 62, 0.22)' } as any)
      : {
          shadowColor: '#42143E',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.22,
          shadowRadius: 8,
        }),
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 128,
    paddingTop: 8,
  },

  // ---------------- Compact iOS Action Card (All Tabs) ----------------
  compactHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginTop: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 16px -2px rgba(30, 19, 32, 0.05), 0 2px 4px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        }),
  },
  compactIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  compactTextCol: {
    flex: 1,
    marginRight: 10,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1320',
    letterSpacing: -0.2,
    fontFamily: LikhoraFont.fontFamily,
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#6E6570',
    marginTop: 2,
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42143E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    flexShrink: 0,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(66, 20, 62, 0.22)' } as any)
      : {
          shadowColor: '#42143E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.22,
          shadowRadius: 4,
        }),
  },
  compactActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginTop: 24,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(30, 19, 32, 0.03)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
        }),
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  filterBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    fontFamily: LikhoraFont.fontFamily,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
    marginTop: 2,
  },
  showcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    overflow: 'hidden',
    elevation: 2,
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px -4px rgba(30, 19, 32, 0.05), 0 2px 6px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }),
  },
  showcaseCoverWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
    backgroundColor: '#F1F5F9',
  },
  showcaseCover: {
    width: '100%',
    height: 150,
    backgroundColor: '#F1F5F9',
  },
  showcaseCoverPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPriceBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    zIndex: 10,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        } as any)
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }),
  },
  floatingPriceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    fontFamily: LikhoraFont.fontFamily,
  },
  showcaseBody: {
    padding: 20,
    gap: 16,
  },
  showcaseHeaderBlock: {
    gap: 3,
  },
  showcaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  showcaseBusinessName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
    flex: 1,
    letterSpacing: -0.2,
  },
  showcaseMetaRow1: {
    marginTop: 1,
  },
  showcaseCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  showcaseOwnerText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  showcaseLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    width: '100%',
  },
  showcaseLocationText: {
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
    flex: 1,
  },
  showcaseBio: {
    fontSize: 13,
    color: '#4A444B',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  offeringsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  offeringTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offeringTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    fontFamily: LikhoraFont.fontFamily,
  },
  showcaseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#F1ECF2',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  likeBtnText: {
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  contactBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8C7DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  contactBtnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  inquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#42143E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  inquireBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Kapihan Worries Feed ----------------
  topicChipsScroll: {
    paddingVertical: 4,
    gap: 8,
    marginTop: 24,
    marginBottom: 28,
  },
  topicChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 6px rgba(30, 19, 32, 0.03)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
        }),
  },
  topicChipActive: {
    backgroundColor: '#42143E',
    borderColor: '#42143E',
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  topicChipTextActive: {
    color: '#FFFFFF',
  },
  worryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    marginBottom: 20,
    gap: 16,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px -4px rgba(30, 19, 32, 0.05), 0 2px 6px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }),
  },
  worryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  worryAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  worryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#EADCEE',
  },
  worryAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0E6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#E2D3E5',
  },
  worryAvatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  worryAuthor: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  worrySub: {
    fontSize: 11,
    color: '#6E6570',
    marginTop: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  topicBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0.5,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
  },
  worryQuestionBlock: {
    gap: 4,
  },
  worryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    fontFamily: LikhoraFont.fontFamily,
  },
  worryBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  readMoreBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  adviceBox: {
    backgroundColor: '#F8F5FA',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#42143E',
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  adviceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  adviceTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE4F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  adviceTogglePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  adviceText: {
    fontSize: 13,
    color: '#42143E',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  statuteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statuteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    fontFamily: LikhoraFont.fontFamily,
  },
  worryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#F1ECF2',
  },
  worryFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  helpfulBtnActive: {
    backgroundColor: '#42143E',
    borderColor: '#42143E',
  },
  helpfulBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  helpfulBtnTextActive: {
    color: '#FFFFFF',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5FA',
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: LikhoraFont.fontFamily,
  },


  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 16,
  },
  favoritesToggle: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.12)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 6px rgba(30, 19, 32, 0.03)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
        }),
  },
  favoritesToggleActive: { backgroundColor: '#42143E', borderColor: '#42143E' },
  favoritesToggleText: {
    color: '#42143E',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  favoritesToggleTextActive: { color: '#FFFFFF' },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    elevation: 2,
    marginTop: 8,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px -4px rgba(30, 19, 32, 0.05), 0 2px 6px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }),
  },
  empty: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px -4px rgba(30, 19, 32, 0.05), 0 2px 6px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }),
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6E6570',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.07)',
    marginBottom: 20,
    gap: 16,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 8px 24px -4px rgba(30, 19, 32, 0.05), 0 2px 6px -1px rgba(30, 19, 32, 0.03)',
        } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        }),
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  author: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2E5F3',
  },
  avatarText: {
    color: '#42143E',
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  authorName: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: LikhoraFont.fontFamily,
  },
  time: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: LikhoraFont.fontFamily,
  },
  coverImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  roadmapContentBlock: {
    gap: 6,
  },
  businessName: {
    fontSize: 17,
    color: '#0F172A',
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#6E6570',
    marginRight: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  summary: {
    marginTop: 4,
    color: '#334155',
    lineHeight: 19,
    fontSize: 13,
    fontFamily: LikhoraFont.fontFamily,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#F1ECF2',
  },
  taskBadge: {
    backgroundColor: '#F5F4F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  taskBadgeText: {
    fontSize: 12,
    color: '#42143E',
    fontWeight: '500',
    fontFamily: LikhoraFont.fontFamily,
  },
  useButton: {
    backgroundColor: '#42143E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  useText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Modals ----------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: 20,
  },
  modalCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xlarge,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalBody: {
    marginTop: 4,
    color: '#64748B',
    lineHeight: 18,
    fontSize: 12,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontFamily: LikhoraFont.fontFamily,
  },
  topicSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  topicSelectBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicSelectBtnActive: {
    backgroundColor: '#42143E',
    borderColor: '#42143E',
  },
  topicSelectText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    fontFamily: LikhoraFont.fontFamily,
  },
  topicSelectTextActive: {
    color: '#FFFFFF',
  },
  imageUrlInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.large,
    paddingHorizontal: 12,
    marginTop: 14,
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  imagePreview: {
    height: 100,
    width: '100%',
    borderRadius: Radius.large,
    marginTop: 10,
    backgroundColor: '#F1F5F9',
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.large,
    padding: 12,
    marginTop: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    fontFamily: LikhoraFont.fontFamily,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancel: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelText: {
    color: '#42143E',
    fontWeight: '800',
    fontSize: 13,
    fontFamily: LikhoraFont.fontFamily,
  },
  publish: {
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#42143E',
    borderRadius: Radius.medium,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  publishText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    fontFamily: LikhoraFont.fontFamily,
  },
  // ---------------- Rich Public Profile Modal (Modal 5) ----------------
  profileModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  profileModalContainer: {
    width: '100%',
    maxWidth: 580,
    height: '92%',
    backgroundColor: '#F5F4F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 -10px 40px rgba(0,0,0,0.25)' } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  profileCoverHeader: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#42143E',
  },
  profileCoverImage: {
    width: '100%',
    height: '100%',
  },
  profileCoverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#320E2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCoverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  profileCloseCircleBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  profileScrollBody: {
    paddingBottom: 40,
  },
  profileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: -38,
    marginBottom: 12,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  profileAvatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  profileAvatarImgFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#42143E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  profileIdentityTextCol: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  profileBusinessNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 22,
  },
  profileFounderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  profileFounderNameText: {
    fontSize: 12,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileBadgeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  profileCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EEF6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.15)',
  },
  profileCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
  },
  profileLocationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
    fontFamily: LikhoraFont.fontFamily,
    maxWidth: 160,
  },
  profileMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginBottom: 16,
    elevation: 1,
  },
  profileMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6E6570',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  profileMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(66, 20, 62, 0.12)',
  },
  profileSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1EBF2',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  profileSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  profileSegmentBtnActive: {
    backgroundColor: '#42143E',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileSegmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileSegmentBtnTextActive: {
    color: '#FFFFFF',
  },
  profileCountBadge: {
    backgroundColor: '#42143E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    marginLeft: 4,
  },
  profileCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileTabContent: {
    paddingHorizontal: 20,
  },
  profileSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginBottom: 12,
    elevation: 1,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#42143E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  profileBioText: {
    fontSize: 13,
    color: '#332735',
    lineHeight: 19,
    fontFamily: LikhoraFont.fontFamily,
  },
  profileOfferingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  profileOfferingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  profileOfferingChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileContactRows: {
    gap: 8,
  },
  profileContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(66, 20, 62, 0.15)',
  },
  profileContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileSocialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  profileSocialBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
  },
  profileAddressText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.08)',
    marginBottom: 14,
    elevation: 1,
  },
  roadmapProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roadmapProgressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapProgressPercent: {
    fontSize: 14,
    fontWeight: '900',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EADCEE',
    overflow: 'hidden',
    marginBottom: 8,
  },
  profileProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#42143E',
  },
  roadmapSubNotice: {
    fontSize: 11,
    color: '#6E6570',
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapEmptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  roadmapEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTimelineList: {
    gap: 0,
  },
  roadmapTimelineItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roadmapTimelineStepCol: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  roadmapStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roadmapStepCircleCompleted: {
    backgroundColor: '#16A34A',
  },
  roadmapStepCircleInProgress: {
    backgroundColor: '#D97706',
  },
  roadmapStepCircleNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTimelineConnectorLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  roadmapTaskCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.1)',
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(30, 19, 32, 0.04)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        }),
  },
  roadmapTaskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  roadmapTaskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 17,
  },
  roadmapStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roadmapStatusPillCompleted: {
    backgroundColor: '#DCFCE7',
  },
  roadmapStatusPillInProgress: {
    backgroundColor: '#FEF3C7',
  },
  roadmapStatusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTaskDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapTaskMetaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  roadmapAgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EEF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roadmapAgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapLegalBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roadmapLegalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4338CA',
    fontFamily: LikhoraFont.fontFamily,
  },
  roadmapSubStepsWrap: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  roadmapSubStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roadmapSubStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginRight: 6,
  },
  roadmapSubStepText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: LikhoraFont.fontFamily,
  },
  adoptRoadmapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42143E',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
    elevation: 2,
  },
  adoptRoadmapBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  profileBottomDismissBtn: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEF5',
    borderRadius: 14,
  },
  profileBottomDismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.large,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: LikhoraFont.fontFamily,
  },
  pickerRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  pickerEmpty: { paddingVertical: 16, paddingHorizontal: 4 },
  pickerEmptyText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },

  // ---------------- Cover Picker (Modal 4) ----------------
  coverPickerSection: {
    marginBottom: 14,
    width: '100%',
  },
  coverPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#42143E',
    marginBottom: 8,
    fontFamily: LikhoraFont.fontFamily,
  },
  uploadCoverBox: {
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8CFDB',
    borderStyle: 'dashed',
    backgroundColor: '#FAF7FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  uploadCoverText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#42143E',
    fontFamily: LikhoraFont.fontFamily,
  },
  uploadCoverSub: {
    fontSize: 11,
    color: '#8A7A8E',
    marginTop: 2,
    fontFamily: LikhoraFont.fontFamily,
  },
  coverPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  coverPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeCoverBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(66, 20, 62, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeCoverText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: LikhoraFont.fontFamily,
  },
  presetSection: {
    marginTop: 10,
  },
  presetSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6570',
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5FA',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: '#E6DEE8',
  },
  presetChipActive: {
    backgroundColor: '#42143E',
    borderColor: '#42143E',
  },
  presetThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  presetText: {
    fontSize: 11,
    color: '#42143E',
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  presetTextActive: {
    color: '#FFFFFF',
  },

  // ---------------- Kapihan Discussion & Replies (Modal 6) ----------------
  repliesModalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 16px 40px rgba(30, 19, 32, 0.16)' } as any)
      : {
          shadowColor: '#1E1320',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 20,
        }),
  },
  repliesModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(66, 20, 62, 0.1)',
  },
  closeRepliesBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repliesTopicBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  repliesTopicBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: LikhoraFont.fontFamily,
  },
  repliesModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
    lineHeight: 20,
  },
  repliesModalAuthor: {
    fontSize: 11,
    color: '#6E6570',
    marginTop: 4,
    fontFamily: LikhoraFont.fontFamily,
  },
  repliesScrollView: {
    maxHeight: 320,
    paddingVertical: 12,
  },
  repliesEmpty: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  repliesEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6E6570',
    marginTop: 10,
    fontFamily: LikhoraFont.fontFamily,
  },
  repliesEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: LikhoraFont.fontFamily,
  },
  replyItem: {
    backgroundColor: '#FAF8FC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.06)',
  },
  replyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#EADCEE',
  },
  replyAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0E6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  replyAvatarInitials: {
    fontSize: 10,
    fontWeight: '800',
    color: '#42143E',
  },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
  },
  replyAuthorBusiness: {
    fontSize: 10,
    color: '#6E6570',
    fontFamily: LikhoraFont.fontFamily,
  },
  replyTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: LikhoraFont.fontFamily,
  },
  replyBodyText: {
    fontSize: 12,
    color: '#332735',
    lineHeight: 18,
    fontFamily: LikhoraFont.fontFamily,
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(66, 20, 62, 0.1)',
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: '#F8F6F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E1320',
    fontFamily: LikhoraFont.fontFamily,
    borderWidth: 0.5,
    borderColor: 'rgba(66, 20, 62, 0.1)',
  },
  sendReplyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#42143E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendReplyBtnDisabled: {
    backgroundColor: '#B5A5B6',
    elevation: 0,
  },
});
