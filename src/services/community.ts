/**
 * Khora Community Service (Phase 4 & Objective 4)
 *
 * Implements:
 * 1. Business Showcase / Marketplace Storefront ("Facebook Page / Marketplace")
 *    - Allows Filipino entrepreneurs to showcase their business, products, price tier, and contacts.
 * 2. Kapihan Worries & Q&A Forum ("Know aspiring business owners' worries")
 *    - Real-world questions and concerns addressed by peers and Khora AI with statutory guidance.
 * 3. Unified persistence with local caching and Supabase synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { askKhoraAI } from './claude';
import { cleanText } from '@/utils/json';
import { supabase } from './supabase';

export interface BusinessShowcase {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  businessName: string;
  businessType: string;
  location: string;
  bio: string;
  coverImageUrl?: string | null;
  priceRange: string;
  offerings: string[];
  contactNumber?: string;
  socialLink?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt: string;
  likesCount: number;
}

export type WorryTopic =
  | 'Taxes & BIR'
  | 'Permits & LGU'
  | 'Capital & Pricing'
  | 'Suppliers & Stock'
  | 'Customers & Sales'
  | (string & {});

export interface EntrepreneurWorry {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  businessType: string;
  stage: string;
  topic: WorryTopic;
  title: string;
  worryText: string;
  khoraAiAdvice: string;
  statutoryReference?: string;
  helpfulVotes: number;
  commentsCount: number;
  createdAt: string;
}

export interface WorryReply {
  id: string;
  worryId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorBusinessType?: string;
  replyText: string;
  createdAt: string;
  likesCount?: number;
}

const STORAGE_KEYS = {
  SHOWCASES: '@likhora_community_showcases_v2',
  WORRIES: '@likhora_community_worries_v2',
  LIKED_SHOWCASES: '@likhora_liked_showcases_v2',
  VOTED_WORRIES: '@likhora_voted_worries_v2',
  WORRY_REPLIES: '@likhora_community_worry_replies_v2',
};

// ---------------------------------------------------------------------------
// 1. Initial Verified Seed Data
// ---------------------------------------------------------------------------
export const SEED_SHOWCASES: BusinessShowcase[] = [
  {
    id: 'showcase-1',
    authorId: 'founder-botika-1',
    authorName: 'Rhea Valenzuela, RPh',
    authorAvatarUrl: null,
    businessName: 'Botika ng Bayan (Botolan Branch)',
    businessType: 'Pharmacy / Drugstore',
    location: 'Brgy. Owaog-Nebloc, Botolan, Zambales',
    bio: 'Neighborhood community pharmacy providing FDA-approved generic medicines, vitamins, and maintenance prescriptions with certified licensed pharmacist consultation.',
    coverImageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
    priceRange: '₱15 – ₱350',
    offerings: ['Generics Act Compliant', 'Cold-Chain Vaccines', 'Free BP Monitoring', 'Senior 20% Discount'],
    contactNumber: '0917-882-3419',
    socialLink: 'facebook.com/botikangbayan.botolan',
    rating: 4.9,
    reviewCount: 38,
    isVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likesCount: 24,
  },
  {
    id: 'showcase-2',
    authorId: 'founder-food-1',
    authorName: 'Nanay Corazon & Family',
    authorAvatarUrl: null,
    businessName: 'Kusinang Nayon Carinderia',
    businessType: 'Carinderia / Food Stall',
    location: 'Brgy. Central, Quezon City, Metro Manila',
    bio: 'Authentic Filipino home-cooked meals prepared fresh every morning. Complete sanitary permit and City Health inspected. Serving packed meals and catering trays.',
    coverImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    priceRange: '₱65 – ₱140 per meal',
    offerings: ['Lutong Bahay Specials', 'Kare-Kare with Bagoong', 'Sanitary Inspected', 'Packed Office Meals'],
    contactNumber: '0928-554-1290',
    socialLink: 'facebook.com/kusinangnayon.qc',
    rating: 4.8,
    reviewCount: 92,
    isVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    likesCount: 45,
  },
  {
    id: 'showcase-3',
    authorId: 'founder-pet-1',
    authorName: 'Dave Arboleda',
    authorAvatarUrl: null,
    businessName: 'Paws & Bubbles Mobile Pet Spa',
    businessType: 'Pet Grooming & Supplies',
    location: 'San Fernando, Pampanga',
    bio: 'Stress-free doorstep pet grooming van. Vet-formulated organic baths, tick & flea treatments, and premium kibble with zero travel anxiety for your fur-babies.',
    coverImageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80',
    priceRange: '₱450 – ₱1,200',
    offerings: ['Door-to-Door Van', 'Medicated Pet Baths', 'Anti-Tick Grooming', 'Vet-Approved Shampoos'],
    contactNumber: '0906-339-8102',
    socialLink: 'facebook.com/pawsandbubbles.ph',
    rating: 5.0,
    reviewCount: 41,
    isVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    likesCount: 37,
  },
  {
    id: 'showcase-4',
    authorId: 'founder-laundry-1',
    authorName: 'Arlene Cruz',
    authorAvatarUrl: null,
    businessName: 'Spin & Fresh Eco Wash',
    businessType: 'Laundry & Dry Cleaning',
    location: 'Marikina City, Metro Manila',
    bio: 'Commercial self-service and wash-dry-fold laundromat with water recycling technology and hypoallergenic detergents. Fast 2-hour turnaround time.',
    coverImageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80',
    priceRange: '₱35 / kg (Wash & Dry)',
    offerings: ['Hypoallergenic Soap', '2-Hour Express', 'Pick-up & Delivery', 'GCash Merchant Accepted'],
    contactNumber: '0919-440-1923',
    socialLink: 'facebook.com/spinandfresh.marikina',
    rating: 4.7,
    reviewCount: 56,
    isVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
    likesCount: 19,
  },
];

export const SEED_WORRIES: EntrepreneurWorry[] = [
  {
    id: 'worry-1',
    authorId: 'founder-elena',
    authorName: 'Elena Ramos',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    businessType: 'Sari-sari Store',
    stage: 'Planning Stage',
    topic: 'Taxes & BIR',
    title: 'Paano po ba ang BIR registration? Natatakot ako sa quarterly taxes at penalties.',
    worryText:
      'First time ko po mag-business at maliit lang ang starting capital ko (₱20,000). Naririnig ko po na mahirap daw ang BIR at may monthly book entries. Paano po kung malugi ako, babayaran ko pa rin ba ang tax?',
    khoraAiAdvice:
      'Huwag matakot, Ka-Likha! Bilang micro-business na may assets under ₱3 Million, kuwalipikado ka sa ilalim ng RA 9178 (BMBE Act) na nagbibigay ng 100% Income Tax Exemption sa iyong kita mula sa operasyon. Mag-register lang sa lokal na DTI Negosyo Center para sa BMBE Certificate of Authority bago pumunta sa BIR RDO. Kailangan mo lang mag-file ng BIR Form 1901 at mag-maintain ng basic books of accounts nang walang babayarang income tax.',
    statutoryReference: 'RA 9178 (Barangay Micro Business Enterprises Act)',
    helpfulVotes: 48,
    commentsCount: 2,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'worry-2',
    authorId: 'founder-marco',
    authorName: 'Marco Cruz',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    businessType: 'Carinderia / Food Stall',
    stage: 'Preparing to Open',
    topic: 'Permits & LGU',
    title: 'Gaano katagal bago ma-release ang Mayor’s Business Permit para sa food business?',
    worryText:
      'Tapos na po ang Barangay clearance at DTI ko. Naghihintay po ako ng Sanitary Inspector para sa food stall ko. May tips po ba kayo para pumasa agad sa inspection at hindi pabalik-balik?',
    khoraAiAdvice:
      'Para sa food businesses, ang City Health Sanitation Inspector ay tumitingin sa 3 pangunahing bagay: (1) Pink health cards ng lahat ng naghahanda ng pagkain mula sa City Health Clinic (kasama ang stool exam at chest X-ray), (2) Maayos na grease trap sa ilalim ng lababo alinsunod sa PD 856 Sanitation Code, at (3) May sneeze guard o salaming takip ang mga lutong ulam. Kapag kumpleto ito, 3 hanggang 5 araw lang ay mai-endorse na ang iyong clearance sa BPLO window.',
    statutoryReference: 'PD 856 (Sanitation Code) & RA 10611 (Food Safety Act)',
    helpfulVotes: 36,
    commentsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'worry-3',
    authorId: 'founder-jessa',
    authorName: 'Jessa Manabat',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    businessType: 'Retail & Packaging',
    stage: 'Idea Stage',
    topic: 'Suppliers & Stock',
    title: 'Looking for low-cost eco-friendly packaging suppliers in Central Luzon / NCR',
    worryText:
      'Masyadong mahal ang retail na microwavable containers at paper bags sa mall. Bumababa ang tubo ko dahil sa lalagyan. Saan po ang reliable na bagsakan na nagbibigay ng presyong bulto?',
    khoraAiAdvice:
      'Para sa malaking tipid sa packaging: (1) Sa Divisoria (Ylaya at Tabora Streets) o Balintawak Market kung makakaluwas ka ng minsan kada buwan, makakakuha ka ng 40% hanggang 50% discount kapag binili nang bulto (per bundle of 500). (2) Maaari mo ring gamitin ang Suppliers tab dito sa Likhora para ma-filter ang mga accredited direct suppliers na nagpapadala nationwide.',
    statutoryReference: 'RA 7394 (Consumer Act & Price Transparency)',
    helpfulVotes: 31,
    commentsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: 'worry-4',
    authorId: 'founder-anthony',
    authorName: 'Anthony Tan',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
    businessType: 'Pharmacy / Botika',
    stage: 'Planning Stage',
    topic: 'Permits & LGU',
    title: 'Puwede po ba mag-apply ng FDA LTO kahit wala pang sariling licensed pharmacist?',
    worryText:
      'Gusto ko po magtayo ng generic drugstore sa barangay namin kasi walang malapit na bilihan ng gamot. Pwede po ba ako muna mag-open bago kumuha ng pharmacist?',
    khoraAiAdvice:
      'Bawal po mag-operate nang walang licensed pharmacist. Sa ilalim ng RA 10918 (Philippine Pharmacy Act) at RA 9711 (FDA Act), mahigpit na ipinagbabawal ang retail sale ng gamot nang walang PRC-registered supervising pharmacist. Ang FDA eServices application ay nangangailangan ng notarized Pharmacist-Owner Agreement bago aprubahan ang iyong License to Operate (LTO). Mag-partner muna sa isang lisensyadong parmasyutiko.',
    statutoryReference: 'RA 10918 (Philippine Pharmacy Act) & RA 9711',
    helpfulVotes: 44,
    commentsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export const SEED_REPLIES: Record<string, WorryReply[]> = {
  'worry-1': [
    {
      id: 'reply-1-1',
      worryId: 'worry-1',
      authorId: 'user-marites',
      authorName: 'Marites Dizon',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
      authorBusinessType: 'Sari-sari Store (Taguig)',
      replyText:
        'Totoo po ang sinabi ni Khora AI! Nung nag-apply ako ng BMBE Certificate sa DTI Negosyo Center, 1 day lang libre pa. Pagpunta ko sa BIR, na-exempt ako sa percentage tax dahil under 3M ang gross sales ko. Wag matakot magpa-rehistro!',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      likesCount: 14,
    },
    {
      id: 'reply-1-2',
      worryId: 'worry-1',
      authorId: 'user-kiko',
      authorName: 'Kiko Panganiban',
      authorAvatarUrl: null,
      authorBusinessType: 'Micro Bakery (Bulacan)',
      replyText:
        'Tip lang din po: bumili kayo ng simpleng 2-column cash receipt book sa bookstore. Ipa-stamp nyo sa BIR kasabay ng Form 1901 para compliant kayo agad.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      likesCount: 8,
    },
  ],
  'worry-2': [
    {
      id: 'reply-2-1',
      worryId: 'worry-2',
      authorId: 'user-danny',
      authorName: 'Chef Danny Ocampo',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      authorBusinessType: 'Carinderia & Catering',
      replyText:
        'Yung grease trap pinaka-chumicheck ng Sanitary Inspector! Bumili kami sa Divisoria ng stainless na grease trap para sa ilalim ng lababo, pumasa agad kami sa inspection.',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      likesCount: 11,
    },
  ],
  'worry-3': [
    {
      id: 'reply-3-1',
      worryId: 'worry-3',
      authorId: 'user-joy',
      authorName: 'Joy Rivera',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
      authorBusinessType: 'Dessert & Pastry Shop',
      replyText:
        'Sa Tabora Street po sa Divisoria, tapat ng Ilaya Textile! Hanapin nyo si Mang Ben packaging, ₱3.50 lang per box kapag 500 pcs ang binili nyo. Sobrang laking bawas sa overhead.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      likesCount: 18,
    },
  ],
  'worry-4': [
    {
      id: 'reply-4-1',
      worryId: 'worry-4',
      authorId: 'user-randy',
      authorName: 'Doc Randy Sioson',
      authorAvatarUrl: null,
      authorBusinessType: 'Community Health Partner',
      replyText:
        'Tama si Khora AI, kailangan talaga ng pharmacist bago mag-submit sa FDA eServices. Pero may mga part-time supervising pharmacists na pwedeng i-hire per branch ayon sa PRC guidelines. Magtanong po kayo sa local chapter ng PPhA.',
      createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
      likesCount: 9,
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Storage & Retrieval Functions
// ---------------------------------------------------------------------------
export const fetchBusinessShowcases = async (): Promise<BusinessShowcase[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHOWCASES);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOWCASES, JSON.stringify(SEED_SHOWCASES));
      return SEED_SHOWCASES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SHOWCASES;
  } catch (err) {
    console.warn('Error reading showcases from storage:', err);
    return SEED_SHOWCASES;
  }
};

export const saveBusinessShowcase = async (
  showcase: Omit<BusinessShowcase, 'id' | 'createdAt' | 'likesCount'>
): Promise<BusinessShowcase> => {
  const current = await fetchBusinessShowcases();
  const newShowcase: BusinessShowcase = {
    ...showcase,
    id: `showcase-${Date.now()}`,
    createdAt: new Date().toISOString(),
    likesCount: 1,
  };
  const updated = [newShowcase, ...current.filter((item) => item.authorId !== showcase.authorId)];
  await AsyncStorage.setItem(STORAGE_KEYS.SHOWCASES, JSON.stringify(updated));
  return newShowcase;
};

export const toggleLikeShowcase = async (
  showcaseId: string,
  userId: string
): Promise<{ isLiked: boolean; newCount: number }> => {
  try {
    const rawLikes = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_SHOWCASES);
    const likedIds: string[] = rawLikes ? JSON.parse(rawLikes) : [];
    const isCurrentlyLiked = likedIds.includes(showcaseId);

    const showcases = await fetchBusinessShowcases();
    const target = showcases.find((s) => s.id === showcaseId);
    let newCount = target?.likesCount || 0;

    if (isCurrentlyLiked) {
      const filtered = likedIds.filter((id) => id !== showcaseId);
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_SHOWCASES, JSON.stringify(filtered));
      newCount = Math.max(0, newCount - 1);
    } else {
      likedIds.push(showcaseId);
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_SHOWCASES, JSON.stringify(likedIds));
      newCount += 1;
    }

    const updatedShowcases = showcases.map((s) =>
      s.id === showcaseId ? { ...s, likesCount: newCount } : s
    );
    await AsyncStorage.setItem(STORAGE_KEYS.SHOWCASES, JSON.stringify(updatedShowcases));

    return { isLiked: !isCurrentlyLiked, newCount };
  } catch (e) {
    console.warn('Error toggling showcase like:', e);
    return { isLiked: false, newCount: 0 };
  }
};

export const fetchLikedShowcaseIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_SHOWCASES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// 3. Kapihan Worries & Advice Forum
// ---------------------------------------------------------------------------
export const fetchEntrepreneurWorries = async (): Promise<EntrepreneurWorry[]> => {
  try {
    const { data: dbPosts, error } = await supabase
      .from('community_forum_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && dbPosts && dbPosts.length > 0) {
      const liveWorries: EntrepreneurWorry[] = dbPosts.map((p: any) => ({
        id: p.id,
        authorId: p.author_id,
        authorName: p.author_name || 'LikhAI Admin',
        authorAvatarUrl: p.author_avatar_url,
        businessType: p.business_type || 'MSME Operations',
        stage: p.is_pinned ? 'Featured Official Advisory' : 'Operations',
        topic: p.topic as WorryTopic,
        title: p.title,
        worryText: p.content,
        khoraAiAdvice: p.ai_advice || 'Official guidance provided by LikhAI Verified Administration.',
        statutoryReference: p.statutory_ref || 'Republic of the Philippines Commercial Law',
        helpfulVotes: p.helpful_votes || 1,
        commentsCount: 0,
        createdAt: p.created_at,
      }));

      // Merge with seed worries so initial discussions remain visible
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORRIES);
      const local: EntrepreneurWorry[] = raw ? JSON.parse(raw) : SEED_WORRIES;
      const combined = [...liveWorries, ...local.filter((l) => !liveWorries.some((lw) => lw.id === l.id))];
      return combined;
    }
  } catch (err) {
    console.warn('Supabase forum posts fetch error, fallback to local:', err);
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORRIES);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.WORRIES, JSON.stringify(SEED_WORRIES));
      return SEED_WORRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_WORRIES;
  } catch (err) {
    console.warn('Error reading worries from storage:', err);
    return SEED_WORRIES;
  }
};

export const createEntrepreneurWorry = async (params: {
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  businessType: string;
  stage: string;
  topic: WorryTopic;
  title: string;
  worryText: string;
}): Promise<EntrepreneurWorry> => {
  // 1. Generate Khora AI Advice with statutory Philippine grounding
  let advice = '';
  let statutoryRef = 'Philippine Commercial Law & LGU Guidelines';

  try {
    const prompt = [
      'You are Khora AI, an empathetic and authoritative mentor for Filipino micro-entrepreneurs.',
      `An entrepreneur who is in the "${params.stage}" of starting a "${params.businessType}" has shared a major worry about "${params.topic}":`,
      `Title: "${params.title}"`,
      `Worry: "${params.worryText}"`,
      '',
      'Provide a reassuring, practical, and highly specific answer in warm, accessible Taglish/Filipino.',
      'Cite the relevant Philippine Republic Act, agency (BIR, DTI, FDA, LGU), or business practice.',
      'Keep your response concise (3-4 sentences), encouraging, and directly actionable.',
    ].join('\n');

    const systemPrompt =
      'You are Khora AI, the premier mentor for Filipino MSMEs. Give practical, legal, and reassuring Taglish advice.';

    const aiRes = await askKhoraAI(prompt, systemPrompt);
    if (aiRes && aiRes.success && aiRes.content) {
      advice = aiRes.content.trim();
    }
  } catch (e) {
    console.warn('AI advice generation failed, using fallback:', e);
  }

  if (!advice) {
    if (params.topic === 'Taxes & BIR') {
      advice =
        'Huwag mabahala, Ka-Likha! Alinsunod sa RA 9178 (BMBE Act), ang mga micro-enterprises na may assets under ₱3M ay 100% exempt sa income tax. Magparehistro sa DTI Negosyo Center bago mag-BIR para ma-avail ang tax incentives at maiwasan ang penalidad.';
      statutoryRef = 'RA 9178 (BMBE Act)';
    } else if (params.topic === 'Permits & LGU') {
      advice =
        'Sundin ang tamang pagkakasunod-sunod: Barangay Clearance muna, sunod ang DTI, bago pumunta sa City Hall para sa Mayor’s Permit at Sanitary clearance. Ihanda ang cedula, lease contract, at 2 valid IDs para tuloy-tuloy ang proseso.';
      statutoryRef = 'RA 7160 (Local Government Code)';
    } else {
      advice =
        'Normal lang kabahan sa simula, ngunit sa tamang pag-compute ng puhunan gamit ang Smart Calculator at pag-canvass sa 3 suppliers, mapapanatag ang iyong negosyo. Nandito ang Likhora Community para sumuporta sa bawat hakbang mo!';
      statutoryRef = 'RA 7394 (Consumer Act)';
    }
  }

  const newWorry: EntrepreneurWorry = {
    ...params,
    id: `worry-${Date.now()}`,
    khoraAiAdvice: advice,
    statutoryReference: statutoryRef,
    helpfulVotes: 1,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    const { data: insertedPost } = await supabase
      .from('community_forum_posts')
      .insert({
        author_id: params.authorId,
        author_name: params.authorName,
        author_avatar_url: params.authorAvatarUrl,
        business_type: params.businessType,
        topic: params.topic,
        title: params.title,
        content: params.worryText,
        ai_advice: advice,
        statutory_ref: statutoryRef,
        is_pinned: false,
        helpful_votes: 1,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertedPost?.id) {
      newWorry.id = insertedPost.id;
    }
  } catch (err) {
    console.warn('Supabase community_forum_posts insert note:', err);
  }

  const current = await fetchEntrepreneurWorries();
  const updated = [newWorry, ...current.filter((w) => w.id !== newWorry.id)];
  await AsyncStorage.setItem(STORAGE_KEYS.WORRIES, JSON.stringify(updated));
  return newWorry;
};

export const voteHelpfulWorry = async (
  worryId: string
): Promise<{ isVoted: boolean; newCount: number }> => {
  try {
    const rawVotes = await AsyncStorage.getItem(STORAGE_KEYS.VOTED_WORRIES);
    const votedIds: string[] = rawVotes ? JSON.parse(rawVotes) : [];
    const isVoted = votedIds.includes(worryId);

    const worries = await fetchEntrepreneurWorries();
    const target = worries.find((w) => w.id === worryId);
    let newCount = target?.helpfulVotes || 0;

    if (isVoted) {
      const filtered = votedIds.filter((id) => id !== worryId);
      await AsyncStorage.setItem(STORAGE_KEYS.VOTED_WORRIES, JSON.stringify(filtered));
      newCount = Math.max(0, newCount - 1);
    } else {
      votedIds.push(worryId);
      await AsyncStorage.setItem(STORAGE_KEYS.VOTED_WORRIES, JSON.stringify(votedIds));
      newCount += 1;
    }

    const updated = worries.map((w) =>
      w.id === worryId ? { ...w, helpfulVotes: newCount } : w
    );
    await AsyncStorage.setItem(STORAGE_KEYS.WORRIES, JSON.stringify(updated));
    return { isVoted: !isVoted, newCount };
  } catch (e) {
    console.warn('Error voting worry:', e);
    return { isVoted: false, newCount: 0 };
  }
};

export const fetchVotedWorryIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.VOTED_WORRIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// 4. Kapihan Worry Replies & Community Discussion
// ---------------------------------------------------------------------------
export const fetchWorryReplies = async (worryId: string): Promise<WorryReply[]> => {
  try {
    const { data: dbReplies, error } = await supabase
      .from('community_forum_replies')
      .select('*')
      .eq('post_id', worryId)
      .order('created_at', { ascending: true });

    if (!error && dbReplies && dbReplies.length > 0) {
      return dbReplies.map((r: any) => ({
        id: r.id,
        worryId: r.post_id,
        authorId: r.author_id,
        authorName: r.author_name || 'LikhAI Admin',
        authorAvatarUrl: r.author_avatar_url,
        authorBusinessType: r.author_role === 'admin' ? 'LikhAI Verified Admin' : 'MSME Member',
        replyText: r.reply_text,
        createdAt: r.created_at,
        likesCount: 0,
      }));
    }
  } catch (err) {
    console.warn('Supabase forum replies fetch error:', err);
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORRY_REPLIES);
    let allReplies: Record<string, WorryReply[]> = raw ? JSON.parse(raw) : null;
    if (!allReplies) {
      allReplies = SEED_REPLIES;
      await AsyncStorage.setItem(STORAGE_KEYS.WORRY_REPLIES, JSON.stringify(SEED_REPLIES));
    }
    return allReplies[worryId] || [];
  } catch (err) {
    console.warn('Error fetching worry replies:', err);
    return SEED_REPLIES[worryId] || [];
  }
};

export const createWorryReply = async (params: {
  worryId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorBusinessType?: string;
  replyText: string;
}): Promise<WorryReply> => {
  const newReply: WorryReply = {
    ...params,
    id: `reply-${Date.now()}`,
    createdAt: new Date().toISOString(),
    likesCount: 0,
  };

  try {
    // Insert into live Supabase forum replies
    await supabase.from('community_forum_replies').insert({
      post_id: params.worryId,
      author_id: params.authorId,
      author_name: params.authorName,
      author_avatar_url: params.authorAvatarUrl,
      author_role: 'member',
      reply_text: params.replyText,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase reply insert note:', err);
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORRY_REPLIES);
    const allReplies: Record<string, WorryReply[]> = raw ? JSON.parse(raw) : { ...SEED_REPLIES };
    const currentList = allReplies[params.worryId] || [];
    allReplies[params.worryId] = [...currentList, newReply];
    await AsyncStorage.setItem(STORAGE_KEYS.WORRY_REPLIES, JSON.stringify(allReplies));

    // Also update commentsCount in local worries cache
    const worries = await fetchEntrepreneurWorries();
    const updatedWorries = worries.map((w) =>
      w.id === params.worryId ? { ...w, commentsCount: (w.commentsCount || 0) + 1 } : w
    );
    await AsyncStorage.setItem(STORAGE_KEYS.WORRIES, JSON.stringify(updatedWorries));
  } catch (e) {
    console.warn('Error saving worry reply:', e);
  }

  return newReply;
};
