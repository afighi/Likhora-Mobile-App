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
}

export interface MarketAnalysisResult {
  competitorCount: number;
  avgCompetitorRating: number | null;
  avgReviewCount: number | null;
  saturationSignal: SaturationSignal;
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

/** Deterministic fallback when the AI is unreachable — density-only, and
 *  clearly labeled as an estimate rather than presented as equally-informed
 *  as the AI+reviews path. */
const buildOfflineResult = (
  competitors: GooglePlaceResult[],
  businessType: string,
  locationLabel: string
): MarketAnalysisResult => {
  const rated = competitors.filter((c) => typeof c.rating === 'number');
  const avgRating = average(rated.map((c) => c.rating as number));
  const avgReviews = average(competitors.filter((c) => typeof c.userRatingCount === 'number').map((c) => c.userRatingCount as number));

  let saturationSignal: SaturationSignal = 'balanced';
  if (competitors.length <= 2) saturationSignal = 'opportunity';
  else if (competitors.length >= 8 && (avgRating ?? 0) >= 4.3) saturationSignal = 'crowded';

  return {
    competitorCount: competitors.length,
    avgCompetitorRating: avgRating,
    avgReviewCount: avgReviews,
    saturationSignal,
    competitors: competitors.slice(0, 10).map((c) => ({
      name: c.name,
      rating: c.rating,
      userRatingCount: c.userRatingCount,
      address: c.address,
    })),
    suggestedTargetMarket: {
      summary: `Offline estimate for ${businessType} in ${locationLabel} — connect to the internet for a fuller AI-reasoned analysis.`,
      segments: [],
    },
    recommendation:
      competitors.length <= 2
        ? `Only ${competitors.length} similar business${competitors.length === 1 ? '' : 'es'} found nearby — this could be an underserved area worth testing, but validate real demand before committing capital.`
        : `${competitors.length} similar businesses found nearby. This is an offline estimate based on count alone — reconnect for a review-informed read on whether the area is actually saturated.`,
    source: 'offline',
  };
};

const buildPrompt = (businessType: string, locationLabel: string, competitors: GooglePlaceResult[]): string => {
  const competitorLines = competitors.length
    ? competitors
        .slice(0, 15)
        .map(
          (c) =>
            `- ${c.name}: rating ${c.rating ?? 'n/a'} (${c.userRatingCount ?? 0} reviews)`
        )
        .join('\n')
    : '(no similar businesses found nearby via Google Places)';

  return [
    'You are Khora AI, assessing market viability for a Filipino micro-entrepreneur.',
    '',
    `BUSINESS TYPE: ${businessType}`,
    `TARGET LOCATION: ${locationLabel}`,
    '',
    'NEARBY SIMILAR BUSINESSES (real Google Places data, do not invent more):',
    competitorLines,
    '',
    'TASK',
    'Judge viability using BOTH how many competitors exist AND their review signal',
    '(rating + review count) — never on competitor count alone. Few competitors with',
    'strong nearby demand (high ratings/review counts on adjacent businesses) can mean',
    'an underserved opportunity, not a risk. Many competitors with weak or aging review',
    'signal can still leave room. State your reasoning honestly from the data given —',
    'do not invent review content or businesses not listed above.',
    '',
    'Also propose a demographic target-market breakdown (age bands + a short role/context',
    'note, e.g. "19-35, working commuters"). If any segment would include people under 18,',
    'mark requires_acceptability_confirmation true for that segment instead of silently',
    'including it — the app will ask the user to explicitly confirm before using it.',
    '',
    'Reply with ONLY a JSON object, no markdown fence and no text around it:',
    '{',
    '  "saturation_signal": "opportunity" | "balanced" | "crowded",',
    '  "target_market_summary": "<1-2 sentences>",',
    '  "segments": [',
    '    { "label": "<short label>", "age_range": "<e.g. 19-35>", "share_estimate": "<e.g. primary/secondary>", "note": "<short note>", "requires_acceptability_confirmation": false }',
    '  ],',
    '  "recommendation": "<2-3 plain-language sentences, grounded in the data above>"',
    '}',
  ].join('\n');
};

/**
 * Fetches real nearby competitor listings, then asks Khora AI to reason
 * about them. Falls back to a clearly-labeled offline density estimate if
 * the AI is unreachable or answers with something that fails validation.
 */
export const analyzeMarket = async (req: AnalyzeMarketRequest): Promise<MarketAnalysisResult> => {
  const competitors = await searchTextPlaces(
    `${req.businessType} business`,
    req.lat,
    req.lng,
    COMPETITOR_RADIUS_METERS
  );

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
      avgReviewCount: average(competitors.filter((c) => typeof c.userRatingCount === 'number').map((c) => c.userRatingCount as number)),
      saturationSignal,
      competitors: competitors.slice(0, 10).map((c) => ({
        name: c.name,
        rating: c.rating,
        userRatingCount: c.userRatingCount,
        address: c.address,
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
      avg_review_count: result.avgReviewCount,
      saturation_signal: result.saturationSignal,
      suggested_target_market: result.suggestedTargetMarket,
      demographic_breakdown: result.suggestedTargetMarket.segments,
      source: result.source,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  return { data: data as MarketAnalysisRow | null, error };
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
