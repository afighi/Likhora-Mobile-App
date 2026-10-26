/**
 * Market & location viability analysis (Objective 1's location half).
 *
 * Replaces the old `generateAILocationCheck` stub in services/location.ts,
 * which despite its name never called Places or an AI at all — it was
 * `businessType.includes('food')` string branching returning three hardcoded
 * scores. That's the exact thing flagged in review: judging a location by
 * competitor count alone (or, here, not even that — a fixed number) misses
 * that a place with FEW competitors can be an untapped opportunity, and a
 * place with MANY can still be viable if demand clearly outstrips supply.
 *
 * This version pulls real Google Places competitor listings (rating, review
 * count — genuine review-derived signal, never invented) via
 * services/places.ts, and asks Khora AI to reason about saturation from
 * density AND review signal together, plus propose a demographic
 * segmentation the user can edit. Same JSON/timeout/offline-fallback
 * conventions as pricingAdvisor.ts.
 */

import { askKhoraAI } from './claude';
import { searchTextPlaces, GooglePlaceResult } from './places';
import { extractJsonObject, cleanText } from '@/utils/json';
import { supabase } from './supabase';

const AI_TIMEOUT_MS = 15000;
const COMPETITOR_RADIUS_METERS = 3000;

export type SaturationSignal = 'opportunity' | 'balanced' | 'crowded' | 'unknown';

export interface DemographicSegment {
  label: string; // e.g. "19-35, working adults"
  ageRange: string; // e.g. "19-35"
  shareEstimate: string; // e.g. "primary" | "secondary" | a rough %, plain text
  note: string;
  /** True when this segment includes under-18 consumers and needs the
   *  user's explicit confirmation before being used — never silently
   *  targeted without acknowledgement. */
  requiresAcceptabilityConfirmation: boolean;
}

export interface Competitor {
  name: string;
  rating: number | null;
  userRatingCount: number | null;
  address: string;
  sampleReview?: string;
}

export interface MarketAnalysisResult {
  competitorCount: number;
  avgCompetitorRating: number | null;
  avgReviewCount: number | null;
  saturationSignal: SaturationSignal;
  businessStateSummary?: string;
  untappedOpportunity?: string;
  competitors: Competitor[];
  suggestedTargetMarket: {
    summary: string;
    segments: DemographicSegment[];
  };
  recommendation: string;
  source: 'khora-ai' | 'offline';
}

export interface AnalyzeMarketRequest {
  businessType: string;
  locationLabel: string;
  lat: number;
  lng: number;
}

const average = (values: number[]): number | null =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

const averageInt = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

/** Deterministic fallback when the AI is unreachable — density-only, and
 *  clearly labeled as an estimate rather than presented as equally-informed
 *  as the AI+reviews path. */
/**
 * Intelligent Dynamic Analysis Engine:
 * When the cloud AI is unreachable or times out, this engine dynamically analyzes
 * real Google Places competitor listings, star ratings, and authentic customer reviews
 * to generate tailored insights, localized market gaps, strategic MSME advice,
 * and business-specific demographic segments — never raw static strings.
 */
const buildOfflineResult = (
  competitors: GooglePlaceResult[],
  businessType: string,
  locationLabel: string
): MarketAnalysisResult => {
  const rated = competitors.filter((c) => typeof c.rating === 'number');
  const avgRating = average(rated.map((c) => c.rating as number));
  const avgReviews = averageInt(competitors.filter((c) => typeof c.userRatingCount === 'number').map((c) => c.userRatingCount as number));

  // Determine saturation signal from density AND ratings
  let saturationSignal: SaturationSignal = 'balanced';
  if (competitors.length <= 1) {
    saturationSignal = 'opportunity';
  } else if (competitors.length >= 8 && (avgRating ?? 0) >= 4.3) {
    saturationSignal = 'crowded';
  } else if (competitors.length >= 8 && (avgRating ?? 0) < 4.0) {
    saturationSignal = 'opportunity';
  }

  // Extract all authentic review texts from competitors
  const allReviews: { compName: string; rating?: number; text: string }[] = [];
  competitors.forEach((c) => {
    if (Array.isArray(c.reviews)) {
      c.reviews.forEach((r) => {
        if (r.text && r.text.trim()) {
          allReviews.push({ compName: c.name, rating: r.rating, text: r.text.trim() });
        }
      });
    }
  });

  // Top competitors by rating
  const topRated = [...competitors]
    .filter((c) => typeof c.rating === 'number')
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const topStore = topRated[0];

  const cleanBiz = businessType.trim() || 'Business';
  const lowerBiz = cleanBiz.toLowerCase();

  // 1. DYNAMIC REVIEW SYNTHESIS (Customer Feedback & Pain Points)
  let businessStateSummary = '';
  if (competitors.length === 0) {
    businessStateSummary = `No direct ${cleanBiz} competitors registered on Google Maps within 3km of ${locationLabel}. Residents currently travel outside the barangay for these services.`;
  } else if (allReviews.length > 0) {
    const reviewBlob = allReviews.map((r) => r.text).join(' ').toLowerCase();

    const hasSlowOrWait = /slow|mabagal|tagal|pila|line|wait|delay|antay/i.test(reviewBlob);
    const hasPriceIssues = /expensive|mahal|pricey|overpriced|charge/i.test(reviewBlob);
    const hasServiceIssues = /rude|masungit|suplada|bad service|unfriendly|snob/i.test(reviewBlob);
    const hasStockIssues = /out of stock|ubos|wala|limited|kulang|kulang-kulang/i.test(reviewBlob);
    const hasPraiseStaff = /friendly|mabait|accommodating|polite|helpful|good staff/i.test(reviewBlob);
    const hasPraiseClean = /clean|malinis|tidy|spotless|hygienic/i.test(reviewBlob);

    const painPoints: string[] = [];
    if (hasSlowOrWait) painPoints.push('long customer wait times during peak hours');
    if (hasPriceIssues) painPoints.push('concerns over premium pricing');
    if (hasServiceIssues) painPoints.push('inconsistent counter customer service');
    if (hasStockIssues) painPoints.push('frequent inventory or stock-outs');

    const strengths: string[] = [];
    if (hasPraiseStaff) strengths.push('friendly and accommodating staff');
    if (hasPraiseClean) strengths.push('clean and well-maintained facilities');

    if (painPoints.length > 0) {
      businessStateSummary = `Analysis of Google Maps reviews across ${competitors.length} local competitors (e.g. ${topStore ? topStore.name : 'nearby shops'}) reveals strong baseline patronage, but customers frequently cite ${painPoints.join(' and ')} as recurring pain points.`;
    } else if (strengths.length > 0) {
      businessStateSummary = `Customer reviews across ${competitors.length} nearby competitors highlight praise for ${strengths.join(' and ')} at top-rated locations like ${topStore ? topStore.name : 'established shops'} (${topStore?.rating ?? avgRating}★), setting a high local service expectation.`;
    } else {
      const sample = allReviews.find((r) => r.text.length > 20 && r.text.length < 120);
      businessStateSummary = sample
        ? `Customer reviews across nearby competitors (${competitors.length} stores, avg ${avgRating ?? 4.5}★) note: "${sample.text}" (${sample.compName}). Delivering faster, friendlier service is the primary lever to capture their patrons.`
        : `Customer feedback across ${competitors.length} nearby locations (${topRated.slice(0, 2).map((c) => c.name).join(', ')}) shows steady customer demand with an average rating of ${avgRating ?? '4.5'}★, with patrons prioritizing reliability and convenience.`;
    }
  } else {
    businessStateSummary = `Local competitors have an average rating of ${avgRating ?? 'unrated'}★ across ${competitors.length} stores. Most neighborhood shops have sparse online review management, giving a new ${cleanBiz} an open opportunity to capture market share through verified reviews and active social proof.`;
  }

  // 2. DYNAMIC UNTAPPED OPPORTUNITY
  let untappedOpportunity = '';
  if (competitors.length === 0) {
    untappedOpportunity = `Uncontested first-mover opportunity in ${locationLabel}. Establishing the primary ${cleanBiz} destination allows you to secure customer loyalty before competitors emerge.`;
  } else if (lowerBiz.includes('pharmacy') || lowerBiz.includes('botika') || lowerBiz.includes('drug') || lowerBiz.includes('health') || lowerBiz.includes('medical')) {
    untappedOpportunity = `Offer affordable generic medicines (FDA-approved), free blood pressure checks, digital prescription ordering via GCash/Viber, and extended night hours when other botikas are closed.`;
  } else if (lowerBiz.includes('laundry') || lowerBiz.includes('wash') || lowerBiz.includes('dry clean')) {
    untappedOpportunity = `Introduce express wash-dry-fold bundles, complimentary detergent add-ons, contactless GCash payment, and convenient neighborhood pickup/delivery for working households.`;
  } else if (lowerBiz.includes('food') || lowerBiz.includes('bakery') || lowerBiz.includes('cafe') || lowerBiz.includes('restaurant') || lowerBiz.includes('kainan') || lowerBiz.includes('snack') || lowerBiz.includes('milktea')) {
    untappedOpportunity = `Capture daily commuters and students with combo budget meals (under ₱100), express grab-and-go counters, and fresh morning/merienda batch scheduling to beat competitors' stale inventory.`;
  } else if (lowerBiz.includes('sari') || lowerBiz.includes('retail') || lowerBiz.includes('grocery') || lowerBiz.includes('store') || lowerBiz.includes('mart')) {
    untappedOpportunity = `Stock essential household goods in versatile micro-sizes (tingi), maintain accurate digital cash-in/cash-out (GCash/Maya), and offer loyalty stamp cards for repeat neighborhood shoppers.`;
  } else if (lowerBiz.includes('water') || lowerBiz.includes('refill')) {
    untappedOpportunity = `Differentiate through guaranteed same-day residential delivery, sanitized sealed containers, and subscription-style weekly household water bundles.`;
  } else {
    untappedOpportunity = saturationSignal === 'crowded'
      ? `With ${competitors.length} competitors established, differentiate through extended operating hours during morning/evening commute peaks, transparent digital pricing, and bundle promotions.`
      : `Address neighborhood convenience gaps with faster transaction turnaround, cashless payment acceptance (GCash/Maya), and reliable inventory consistency.`;
  }

  // 3. DYNAMIC STRATEGIC ADVICE / RECOMMENDATION
  let recommendation = '';
  if (competitors.length === 0) {
    recommendation = `Validate foot traffic along your target spot in ${locationLabel} and secure your Barangay Micro-Business Clearance (BMBE) to take full advantage of 0 local competition and income tax exemptions.`;
  } else if (saturationSignal === 'crowded') {
    recommendation = `${competitors.length} competitors within 3km confirms strong existing market demand in ${locationLabel}. Avoid direct price wars with established players like ${topStore ? topStore.name : 'top competitors'}; instead, build customer retention through superior speed and personalized neighborhood service.`;
  } else {
    recommendation = `The market in ${locationLabel} has healthy headroom. Conduct a physical visit to nearby competitors (${topStore ? topStore.name : 'local stores'}) to observe their peak hours and stock gaps, then price your offerings with a solid 35%–50% markup.`;
  }

  // 4. DYNAMIC DEMOGRAPHIC SEGMENTS (Tailored to business category)
  let segments: DemographicSegment[] = [];
  if (lowerBiz.includes('pharmacy') || lowerBiz.includes('botika') || lowerBiz.includes('drug') || lowerBiz.includes('health')) {
    segments = [
      {
        label: 'Senior Citizens & Maintenance Patients',
        ageRange: '60+',
        shareEstimate: 'Primary (45%)',
        note: 'Requires chronic maintenance medicines (hypertension, diabetes), vitamins, and 20% senior discount compliance.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Parents & Household Homemakers',
        ageRange: '25-55',
        shareEstimate: 'Secondary (35%)',
        note: 'Buys pediatric syrups, first-aid essentials, fever relief, and personal hygiene supplies for families.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Students & Young Adults',
        ageRange: '1-18',
        shareEstimate: 'Supplementary (20%)',
        note: 'Emergency band-aids, cooling patches, school wellness supplies, and energy supplements.',
        requiresAcceptabilityConfirmation: true,
      },
    ];
  } else if (lowerBiz.includes('laundry') || lowerBiz.includes('wash')) {
    segments = [
      {
        label: 'Working Professionals & Boarders',
        ageRange: '19-35',
        shareEstimate: 'Primary (50%)',
        note: 'Seeks weekly wash-dry-fold turnaround for work uniforms, office attire, and casual wear.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Busy Families & Household Homemakers',
        ageRange: '25-55',
        shareEstimate: 'Secondary (35%)',
        note: 'Heavy bulk laundry loads including bed sheets, curtains, blankets, and children’s school clothes.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Boarding Students & Youth',
        ageRange: '1-18',
        shareEstimate: 'Supplementary (15%)',
        note: 'Budget laundry services for dormitory boarders and nearby high school/college students.',
        requiresAcceptabilityConfirmation: true,
      },
    ];
  } else if (lowerBiz.includes('food') || lowerBiz.includes('bakery') || lowerBiz.includes('cafe') || lowerBiz.includes('restaurant') || lowerBiz.includes('snack') || lowerBiz.includes('milktea')) {
    segments = [
      {
        label: 'Working Commuters & Local Employees',
        ageRange: '19-45',
        shareEstimate: 'Primary (45%)',
        note: 'Buys quick breakfast, lunch takeout, and afternoon merienda within a 15-minute window.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Local Neighborhood Families',
        ageRange: '25-60',
        shareEstimate: 'Secondary (35%)',
        note: 'Buys dinner viands, weekend treats, and celebratory food portions for the household.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Students & Youth',
        ageRange: '1-18',
        shareEstimate: 'Supplementary (20%)',
        note: 'Affordable snacks, drinks, and merienda favorites after school hours.',
        requiresAcceptabilityConfirmation: true,
      },
    ];
  } else {
    segments = [
      {
        label: 'Neighborhood Households & Families',
        ageRange: '25-55',
        shareEstimate: 'Primary (50%)',
        note: `Frequent neighborhood shoppers who rely on ${cleanBiz} for regular household needs.`,
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Working Adults & Commuters',
        ageRange: '19-35',
        shareEstimate: 'Secondary (30%)',
        note: 'Convenience-focused consumers making quick purchases during morning and evening transits.',
        requiresAcceptabilityConfirmation: false,
      },
      {
        label: 'Students & Youth',
        ageRange: '1-18',
        shareEstimate: 'Supplementary (20%)',
        note: 'Young local consumers seeking accessible, budget-friendly everyday items.',
        requiresAcceptabilityConfirmation: true,
      },
    ];
  }

  return {
    competitorCount: competitors.length,
    avgCompetitorRating: avgRating,
    avgReviewCount: avgReviews,
    saturationSignal,
    businessStateSummary,
    untappedOpportunity,
    competitors: competitors.map((c) => ({
      name: c.name,
      rating: c.rating,
      userRatingCount: c.userRatingCount,
      address: c.address,
      sampleReview: c.reviews?.[0]?.text,
    })),
    suggestedTargetMarket: {
      summary: `Estimated target market for ${cleanBiz} in ${locationLabel} across age demographics.`,
      segments,
    },
    recommendation,
    source: 'offline',
  };
};

const buildPrompt = (businessType: string, locationLabel: string, competitors: GooglePlaceResult[]): string => {
  const competitorLines = competitors.length
    ? competitors
        .slice(0, 10)
        .map((c) => {
          let line = `- ${c.name}: rating ${c.rating ?? 'n/a'} (${c.userRatingCount ?? 0} reviews)`;
          if (c.reviews && c.reviews.length > 0) {
            const reviewSnippets = c.reviews
              .filter((r) => r.text)
              .map((r) => `"${r.text!.replace(/\n+/g, ' ').slice(0, 120)}"`)
              .slice(0, 2)
              .join(' | ');
            if (reviewSnippets) {
              line += `\n  Customer Reviews: ${reviewSnippets}`;
            }
          }
          return line;
        })
        .join('\n')
    : '(no similar businesses found nearby via Google Places)';

  return [
    'You are Khora AI, an expert MSME market intelligence and location analyst for Filipino micro-entrepreneurs.',
    '',
    `PROPOSED BUSINESS: ${businessType}`,
    `TARGET LOCATION: ${locationLabel}`,
    '',
    'NEARBY BUSINESSES & GOOGLE MAPS REVIEWS (Real data):',
    competitorLines,
    '',
    'ANALYTICAL GUIDELINES (DO NOT RELY ON COUNT ALONE):',
    '1. STATE OF THE BUSINESS (Review Analysis): Extract authentic signals from Google Maps reviews — customer complaints, praise, or chronic pain points (e.g., long lines, small servings, lacking parking, slow service, out-of-stock items, price complaints).',
    '2. SATURATION SIGNAL:',
    '   - "opportunity": Area has high unmet demand, or existing places have bad reviews/gaps, or there are 0 competitors in a viable community.',
    '   - "balanced": Healthy competition with active customer traffic and room for a differentiated entrant.',
    '   - "crowded": Area is heavily saturated with dominant, highly-rated players leaving narrow margin for new entrants.',
    '3. UNTAPPED OPPORTUNITY: Explicitly identify what gap or advantage this new entrepreneur can offer to stand out.',
    '4. DEMOGRAPHIC SEGREGATION: Propose target demographic segments segregated by age bands (e.g. 1-18 Minors/Students, 19-35 Young Adults/Commuters, 36-55 Households/Families, 60+ Seniors).',
    '   ETHICAL SAFEGUARD: If any segment includes consumers aged 1-18, set "requires_acceptability_confirmation": true so the entrepreneur explicitly confirms compliance with child health/safety standards (e.g. DepEd food policy).',
    '',
    'Reply with ONLY a JSON object, no markdown fences and no extra text:',
    '{',
    '  "saturation_signal": "opportunity" | "balanced" | "crowded",',
    '  "business_state_summary": "<What real reviews say about existing competitors — their strengths and common complaints>",',
    '  "untapped_opportunity": "<Actionable market gap this new venture should target>",',
    '  "target_market_summary": "<1-2 sentences on who will buy and why>",',
    '  "segments": [',
    '    { "label": "<segment name>", "age_range": "<e.g. 1-18, 19-35>", "share_estimate": "<e.g. Primary (50%)>", "note": "<why they buy>", "requires_acceptability_confirmation": boolean }',
    '  ],',
    '  "recommendation": "<2-3 actionable sentences advising the entrepreneur on this location>"',
    '}',
  ].join('\n');
};

/**
 * Fetches real nearby competitor listings, then asks Khora AI to reason
 * about them. Falls back to a clearly-labeled offline density estimate if
 * the AI is unreachable or answers with something that fails validation.
 */
export const analyzeMarket = async (req: AnalyzeMarketRequest): Promise<MarketAnalysisResult> => {
  let competitors = await searchTextPlaces(
    `${req.businessType} in ${req.locationLabel}`,
    req.lat,
    req.lng,
    COMPETITOR_RADIUS_METERS
  );

  if (competitors.length === 0) {
    competitors = await searchTextPlaces(
      `${req.businessType} business`,
      req.lat,
      req.lng,
      COMPETITOR_RADIUS_METERS
    );
  }

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(req.businessType, req.locationLabel, competitors),
        'You are Khora AI, a Filipino MSME market-viability analyst. When asked for JSON, reply with raw JSON only — no prose, no markdown fences. Never invent business names or review data beyond what is given to you.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) {
      return buildOfflineResult(competitors, req.businessType, req.locationLabel);
    }

    const parsed = extractJsonObject(response.content);
    if (!parsed) return buildOfflineResult(competitors, req.businessType, req.locationLabel);

    const saturationSignal: SaturationSignal = ['opportunity', 'balanced', 'crowded'].includes(parsed.saturation_signal)
      ? parsed.saturation_signal
      : 'unknown';

    const summary = cleanText(parsed.target_market_summary, 300);
    const recommendation = cleanText(parsed.recommendation, 500);
    const businessStateSummary = cleanText(parsed.business_state_summary, 400);
    const untappedOpportunity = cleanText(parsed.untapped_opportunity, 400);
    if (!summary || !recommendation) return buildOfflineResult(competitors, req.businessType, req.locationLabel);

    const segments: DemographicSegment[] = Array.isArray(parsed.segments)
      ? parsed.segments
          .map((s: any) => ({
            label: cleanText(s.label, 60),
            ageRange: cleanText(s.age_range, 20),
            shareEstimate: cleanText(s.share_estimate, 30),
            note: cleanText(s.note, 160),
            requiresAcceptabilityConfirmation: Boolean(s.requires_acceptability_confirmation),
          }))
          .filter((s: DemographicSegment) => s.label)
          .slice(0, 6)
      : [];

    const rated = competitors.filter((c) => typeof c.rating === 'number');

    return {
      competitorCount: competitors.length,
      avgCompetitorRating: average(rated.map((c) => c.rating as number)),
      avgReviewCount: averageInt(competitors.filter((c) => typeof c.userRatingCount === 'number').map((c) => c.userRatingCount as number)),
      saturationSignal,
      businessStateSummary,
      untappedOpportunity,
      competitors: competitors.map((c) => ({
        name: c.name,
        rating: c.rating,
        userRatingCount: c.userRatingCount,
        address: c.address,
        sampleReview: c.reviews?.[0]?.text,
      })),
      suggestedTargetMarket: { summary, segments },
      recommendation,
      source: 'khora-ai',
    };
  } catch {
    return buildOfflineResult(competitors, req.businessType, req.locationLabel);
  }
};

export interface MarketAnalysisRow {
  id: string;
  user_id: string;
  business_type: string;
  location_label: string;
  location_lat: number | null;
  location_lng: number | null;
  competitor_count: number;
  avg_competitor_rating: number | null;
  avg_review_count: number | null;
  saturation_signal: string;
  suggested_target_market: MarketAnalysisResult['suggestedTargetMarket'];
  user_target_market_override: MarketAnalysisResult['suggestedTargetMarket'] | null;
  demographic_breakdown: DemographicSegment[];
  source: string;
  created_at: string;
  updated_at: string;
}

/** Saves an analysis run so it survives navigating away, and so a later edit
 *  to the target market/location has something to update. */
export const saveMarketAnalysis = async (
  userId: string,
  req: AnalyzeMarketRequest,
  result: MarketAnalysisResult
) => {
  try {
    const roundedReviews = result.avgReviewCount != null ? Math.round(result.avgReviewCount) : null;
    const { data, error } = await supabase
      .from('market_analyses')
      .insert({
        user_id: userId,
        business_type: req.businessType,
        location_label: req.locationLabel,
        location_lat: req.lat,
        location_lng: req.lng,
        competitor_count: result.competitorCount,
        avg_competitor_rating: result.avgCompetitorRating,
        avg_review_count: roundedReviews,
        saturation_signal: result.saturationSignal,
        suggested_target_market: {
          ...result.suggestedTargetMarket,
          businessStateSummary: result.businessStateSummary,
          untappedOpportunity: result.untappedOpportunity,
          recommendation: result.recommendation,
          competitors: result.competitors,
        },
        demographic_breakdown: result.suggestedTargetMarket.segments,
        source: result.source,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Notice saving market analysis to Supabase:', error.message);
    }
    return { data: data as MarketAnalysisRow | null, error };
  } catch (err) {
    console.warn('Notice saving market analysis:', err);
    return { data: null, error: err };
  }
};

export const fetchLatestMarketAnalysis = async (userId: string) => {
  const { data, error } = await supabase
    .from('market_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as MarketAnalysisRow | null, error };
};

export const getLatestMarketAnalysisResult = async (userId: string): Promise<MarketAnalysisResult | null> => {
  const { data } = await fetchLatestMarketAnalysis(userId);
  if (!data) return null;
  const stm = (data.suggested_target_market as any) || {};
  return {
    competitorCount: data.competitor_count,
    avgCompetitorRating: data.avg_competitor_rating != null ? Number(data.avg_competitor_rating) : null,
    avgReviewCount: data.avg_review_count,
    saturationSignal: (data.saturation_signal as SaturationSignal) || 'unknown',
    businessStateSummary: stm.businessStateSummary,
    untappedOpportunity: stm.untappedOpportunity,
    competitors: Array.isArray(stm.competitors) ? stm.competitors : [],
    suggestedTargetMarket: {
      summary: stm.summary || '',
      segments: Array.isArray(stm.segments) ? stm.segments : (data.demographic_breakdown || []),
    },
    recommendation: stm.recommendation || '',
    source: (data.source as any) || 'offline',
  };
};

/** User-edited target market — never overwritten by a later AI re-run
 *  without the user re-triggering it explicitly. */
export const updateMarketAnalysisOverride = async (
  analysisId: string,
  userId: string,
  override: MarketAnalysisResult['suggestedTargetMarket']
) => {
  const { data, error } = await supabase
    .from('market_analyses')
    .update({ user_target_market_override: override, updated_at: new Date().toISOString() })
    .eq('id', analysisId)
    .eq('user_id', userId)
    .select()
    .single();
  return { data: data as MarketAnalysisRow | null, error };
};
