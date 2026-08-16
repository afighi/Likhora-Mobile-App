import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BookOpen, Heart, MapPin, Plus, Store, Trash2, UserRound, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { CommunityPost, createCommunityPost, deleteCommunityPost, fetchCommunityPosts, fetchFavoriteTemplateIds, fetchUserRoadmap, getSupabaseClient, replaceUserRoadmap, toggleFavoriteTemplate } from '@/services/supabase';

const relativeTime = (date: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

export default function CommunityTab() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { unreadCount } = useNotification();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showProfile, setShowProfile] = useState<CommunityPost | null>(null);
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await fetchCommunityPosts();
    if (!error && data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadPosts();
    const supabase = getSupabaseClient();
    const channel = supabase.channel('community-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, (payload) => {
        const post = payload.new as CommunityPost;
        setPosts((items) => items.some((item) => item.id === post.id) ? items : [post, ...items]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!user?.uid) { setFavoriteIds([]); return; }
    void fetchFavoriteTemplateIds(user.uid).then(({ data }) => setFavoriteIds(data));
  }, [user?.uid]);

  const publishMyRoadmap = async () => {
    if (!user?.uid || !userProfile) return;
    if (summary.trim().length < 12) {
      Alert.alert('Add a short description', 'Write at least 12 characters so other founders know why your roadmap is useful.');
      return;
    }
    setPublishing(true);
    const { data: tasks, error: roadmapError } = await fetchUserRoadmap(user.uid);
    if (roadmapError || !tasks?.length) {
      setPublishing(false);
      Alert.alert('No roadmap to share', 'Finish onboarding or add a custom roadmap task first.');
      return;
    }
    const { data, error } = await createCommunityPost({
      author_id: user.uid, author_name: userProfile.full_name || 'LikhAI founder',
      business_name: userProfile.business_name || 'My business plan', business_type: userProfile.business_type || 'Small business',
      location: userProfile.location || 'Philippines', summary: summary.trim(), image_url: imageUrl.trim(), template_data: tasks,
    });
    setPublishing(false);
    if (error || !data) { Alert.alert('Could not publish', 'Confirm that the community migration has been run, then try again.'); return; }
    setPosts((items) => items.some((post) => post.id === data.id) ? items : [data, ...items]);
    setSummary(''); setImageUrl(''); setShowShareModal(false);
  };

  const useTemplate = (post: CommunityPost) => {
    if (!user?.uid) return;
    Alert.alert('Use this roadmap?', 'This will replace your current roadmap with this community template.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use template', onPress: async () => {
        const { error } = await replaceUserRoadmap(user.uid, post.template_data);
        if (error) { Alert.alert('Could not use template', 'Please try again after running the database migration.'); return; }
        router.push('/roadmap');
      } },
    ]);
  };

  const removePost = (post: CommunityPost) => {
    Alert.alert('Delete your post?', 'This removes the shared template for everyone. Your own roadmap is unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!user?.uid) return;
        const { error } = await deleteCommunityPost(post.id, user.uid);
        if (!error) setPosts((items) => items.filter((item) => item.id !== post.id));
      } },
    ]);
  };

  const toggleFavorite = async (postId: string) => {
    if (!user?.uid) { Alert.alert('Sign in required', 'Sign in to save community templates.'); return; }
    const isFavorite = favoriteIds.includes(postId);
    setFavoriteIds((items) => isFavorite ? items.filter((id) => id !== postId) : [...items, postId]);
    const { error } = await toggleFavoriteTemplate(user.uid, postId, isFavorite);
    if (error) setFavoriteIds((items) => isFavorite ? [...items, postId] : items.filter((id) => id !== postId));
  };

  const visiblePosts = showFavorites ? posts.filter((post) => favoriteIds.includes(post.id)) : posts;

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <View style={styles.topNotifBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <Bell size={19} color={LikhoraColors.textPrimary} />
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.title}>Founder Community</Text>
        <Text style={styles.subtitle}>Share proven launch plans with local entrepreneurs.</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPosts} tintColor={LikhoraColors.primary} />}>
      <View style={styles.hero}><Users size={24} color="#FFFFFF" /><View style={{ flex: 1 }}><Text style={styles.heroTitle}>Make your experience useful</Text><Text style={styles.heroText}>Publish your roadmap as a reusable community template.</Text></View><TouchableOpacity style={styles.shareButton} onPress={() => setShowShareModal(true)}><Plus size={16} color={LikhoraColors.primary} /><Text style={styles.shareText}>Share</Text></TouchableOpacity></View>
      <View style={styles.libraryHeader}><Text style={styles.sectionTitle}>{showFavorites ? 'Favorite templates' : 'Community roadmaps'}</Text><TouchableOpacity style={[styles.favoritesToggle, showFavorites && styles.favoritesToggleActive]} onPress={() => setShowFavorites((value) => !value)}><Heart size={14} color={showFavorites ? '#FFFFFF' : LikhoraColors.primary} fill={showFavorites ? '#FFFFFF' : 'transparent'} /><Text style={[styles.favoritesToggleText, showFavorites && styles.favoritesToggleTextActive]}>{showFavorites ? 'All templates' : `Favorites (${favoriteIds.length})`}</Text></TouchableOpacity></View>
      {loading && posts.length === 0 ? <ActivityIndicator color={LikhoraColors.primary} /> : null}
      {!loading && posts.length === 0 ? <View style={styles.empty}><BookOpen size={30} color={LikhoraColors.textPlaceholder} /><Text style={styles.emptyTitle}>No shared roadmaps yet</Text><Text style={styles.emptyText}>Be the first founder to share a plan.</Text></View> : null}
      {visiblePosts.map((post) => <View key={post.id} style={styles.card}>
        <View style={styles.cardTop}><TouchableOpacity style={styles.author} onPress={() => setShowProfile(post)}><View style={styles.avatar}><Text style={styles.avatarText}>{post.author_name.slice(0, 1).toUpperCase()}</Text></View><View><Text style={styles.authorName}>{post.author_name}</Text><Text style={styles.time}>{relativeTime(post.created_at)}</Text></View></TouchableOpacity><View style={styles.cardActions}><TouchableOpacity onPress={() => toggleFavorite(post.id)}><Heart size={19} color={LikhoraColors.primary} fill={favoriteIds.includes(post.id) ? LikhoraColors.primary : 'transparent'} /></TouchableOpacity>{post.author_id === user?.uid ? <TouchableOpacity onPress={() => removePost(post)}><Trash2 size={18} color={LikhoraColors.errorRed} /></TouchableOpacity> : null}</View></View>
        {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.coverImage} resizeMode="cover" /> : null}
        <Text style={styles.businessName}>{post.business_name}</Text><View style={styles.meta}><Store size={13} color={LikhoraColors.primary} /><Text style={styles.metaText}>{post.business_type}</Text><MapPin size={13} color={LikhoraColors.primary} /><Text style={styles.metaText}>{post.location}</Text></View><Text style={styles.summary}>{post.summary}</Text><View style={styles.cardBottom}><Text style={styles.taskCount}>{post.template_data?.length || 0} roadmap tasks</Text><TouchableOpacity style={styles.useButton} onPress={() => useTemplate(post)}><Text style={styles.useText}>Use template</Text></TouchableOpacity></View>
      </View>)}
    </ScrollView>
    <Modal visible={showShareModal} transparent animationType="slide" onRequestClose={() => setShowShareModal(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Share your roadmap</Text><Text style={styles.modalBody}>Your business name, category, location, summary, and roadmap tasks will be visible to the community.</Text><TextInput style={styles.imageUrlInput} value={imageUrl} onChangeText={setImageUrl} keyboardType="url" autoCapitalize="none" placeholder="Cover image URL (optional)" placeholderTextColor={LikhoraColors.textPlaceholder} />{imageUrl ? <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" /> : null}<TextInput style={styles.input} value={summary} onChangeText={setSummary} multiline maxLength={280} placeholder="What did you learn or what makes this plan helpful?" placeholderTextColor={LikhoraColors.textPlaceholder} /><View style={styles.modalActions}><TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={publishMyRoadmap} style={styles.publish} disabled={publishing}>{publishing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Publish</Text>}</TouchableOpacity></View></View></View></Modal>
    <Modal visible={Boolean(showProfile)} transparent animationType="fade" onRequestClose={() => setShowProfile(null)}><View style={styles.modalBackdrop}><View style={styles.profileCard}><View style={styles.profileAvatar}><UserRound size={30} color="#FFFFFF" /></View><Text style={styles.profileName}>{showProfile?.author_name}</Text><Text style={styles.profileBusiness}>{showProfile?.business_name}</Text><Text style={styles.profileMeta}>{showProfile?.business_type} · {showProfile?.location}</Text><TouchableOpacity style={styles.closeProfile} onPress={() => setShowProfile(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LikhoraColors.backgroundScreen }, header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: 1, borderColor: LikhoraColors.border }, topNotifBar: { alignItems: 'flex-end', marginBottom: 4 }, title: { fontSize: 24, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, subtitle: { marginTop: 3, fontSize: 12, color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily }, iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', position: 'relative' }, unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: LikhoraColors.errorRed, position: 'absolute', right: 7, top: 7 }, content: { padding: Spacing.four, gap: 14, paddingBottom: 110 }, hero: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: LikhoraColors.primary, padding: Spacing.four, borderRadius: Radius.xlarge }, heroTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, heroText: { color: '#F2E5F3', fontSize: 12, marginTop: 3, fontFamily: LikhoraFont.fontFamily }, shareButton: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, shareText: { color: LikhoraColors.primary, fontWeight: '800', fontSize: 12, fontFamily: LikhoraFont.fontFamily }, libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 17, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, favoritesToggle: { flexDirection: 'row', gap: 5, alignItems: 'center', borderWidth: 1, borderColor: LikhoraColors.primary, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 6 }, favoritesToggleActive: { backgroundColor: LikhoraColors.primary }, favoritesToggleText: { color: LikhoraColors.primary, fontSize: 11, fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, favoritesToggleTextActive: { color: '#FFFFFF' }, empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: Radius.xlarge, padding: 28 }, emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, emptyText: { marginTop: 4, fontSize: 12, color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily }, card: { backgroundColor: '#FFFFFF', borderRadius: Radius.xlarge, padding: Spacing.four, borderWidth: 1, borderColor: LikhoraColors.border }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardActions: { flexDirection: 'row', gap: 12 }, author: { flexDirection: 'row', gap: 8, alignItems: 'center' }, avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: LikhoraColors.secondaryLavender }, avatarText: { color: LikhoraColors.primary, fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, authorName: { color: LikhoraColors.textPrimary, fontWeight: '700', fontSize: 13, fontFamily: LikhoraFont.fontFamily }, time: { color: LikhoraColors.textPlaceholder, fontSize: 11, fontFamily: LikhoraFont.fontFamily }, coverImage: { width: '100%', height: 150, borderRadius: Radius.large, marginTop: 14, backgroundColor: LikhoraColors.inputBackground }, businessName: { fontSize: 18, color: LikhoraColors.textPrimary, fontWeight: '800', marginTop: 14, fontFamily: LikhoraFont.fontFamily }, meta: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 7 }, metaText: { fontSize: 11, color: LikhoraColors.textSecondary, marginRight: 7, fontFamily: LikhoraFont.fontFamily }, summary: { marginTop: 10, color: LikhoraColors.textPrimary, lineHeight: 19, fontSize: 13, fontFamily: LikhoraFont.fontFamily }, cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, taskCount: { fontSize: 12, color: LikhoraColors.textSecondary, fontFamily: LikhoraFont.fontFamily }, useButton: { backgroundColor: LikhoraColors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill }, useText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.four }, modalCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xlarge, padding: Spacing.four }, modalTitle: { fontSize: 20, fontWeight: '800', color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, modalBody: { marginTop: 7, color: LikhoraColors.textSecondary, lineHeight: 19, fontSize: 12, fontFamily: LikhoraFont.fontFamily }, imageUrlInput: { height: 46, borderWidth: 1, borderColor: LikhoraColors.border, borderRadius: Radius.large, paddingHorizontal: 12, marginTop: 16, color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, imagePreview: { height: 110, width: '100%', borderRadius: Radius.large, marginTop: 10, backgroundColor: LikhoraColors.inputBackground }, input: { minHeight: 110, borderWidth: 1, borderColor: LikhoraColors.border, borderRadius: Radius.large, padding: 12, marginTop: 16, color: LikhoraColors.textPrimary, textAlignVertical: 'top', fontFamily: LikhoraFont.fontFamily }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }, cancel: { padding: 12 }, cancelText: { color: LikhoraColors.primary, fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, publish: { minWidth: 90, alignItems: 'center', backgroundColor: LikhoraColors.primary, borderRadius: Radius.pill, padding: 12 }, publishText: { color: '#FFFFFF', fontWeight: '800', fontFamily: LikhoraFont.fontFamily }, profileCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xlarge, padding: 28, alignItems: 'center' }, profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: LikhoraColors.primary, alignItems: 'center', justifyContent: 'center' }, profileName: { marginTop: 12, fontWeight: '800', fontSize: 19, color: LikhoraColors.textPrimary, fontFamily: LikhoraFont.fontFamily }, profileBusiness: { marginTop: 4, color: LikhoraColors.primary, fontWeight: '700', fontFamily: LikhoraFont.fontFamily }, profileMeta: { marginTop: 5, color: LikhoraColors.textSecondary, fontSize: 12, fontFamily: LikhoraFont.fontFamily }, closeProfile: { marginTop: 18, padding: 10 },
});
