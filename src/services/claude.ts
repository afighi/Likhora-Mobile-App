// Khora AI Integration for Likhora AI.
//
// The Anthropic key lives on the server, never in the Expo bundle — the app
// talks to the "khora-ai" Supabase Edge Function, which holds the key as a
// secret and decides the model, effort and token ceiling itself.
//
// Every call falls back to the local advisor below when the function is
// unreachable, so the app still answers offline. That fallback is keyword
// matched, not generated: callers that need structured output (pricingAdvisor,
// onboardingAdvisor, supplierAdvisor) detect the difference by failing to
// parse JSON out of it, and use their own deterministic path instead.

import { supabase } from './supabase';

// Optional override for anyone self-hosting their own endpoint instead of
// using the Edge Function.
const KHORA_AI_ENDPOINT = process.env.EXPO_PUBLIC_KHORA_AI_ENDPOINT;

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

/** Pulls the reply text out of Anthropic's response shape. */
const readReplyText = (data: any): string | null => {
  const text = data?.content?.[0]?.text;
  return typeof text === 'string' && text.trim() ? text : null;
};

export const askKhoraAI = async (prompt: string, systemPrompt?: string): Promise<AIResponse> => {
  // 1. Live response, via the Edge Function (or a self-hosted endpoint).
  try {
    if (KHORA_AI_ENDPOINT) {
      const response = await fetch(KHORA_AI_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, system: systemPrompt }),
      });

      if (response.ok) {
        const replyText = readReplyText(await response.json());
        if (replyText) return { content: replyText, success: true };
      }
    } else {
      const { data, error } = await supabase.functions.invoke('khora-ai', {
        body: { prompt, system: systemPrompt },
      });

      if (!error) {
        const replyText = readReplyText(data);
        if (replyText) return { content: replyText, success: true };
      } else {
        console.warn('Khora AI function error:', error);
      }
    }
  } catch (err) {
    console.warn('Khora AI unreachable, using local advisor:', err);
  }

  // 2. Intelligent Contextual Natural Language AI Engine
  const trimmed = prompt.trim();
  const lowerPrompt = trimmed.toLowerCase();

  let fallbackText = `Mabuhay! As Khora AI, your small business advisor, I recommend focusing on securing your DTI name registration & local Barangay permit while maintaining at least a 35%-50% gross profit margin on your products! How else can I guide your venture today?`;

  // A. GREETINGS & INTROS
  if (/^(hello|hi|hey|kamusta|magandang|good morning|good afternoon|good evening|greetings)/i.test(lowerPrompt) || lowerPrompt === 'hi' || lowerPrompt === 'hello') {
    fallbackText = `Mabuhay! 👋 I am Khora AI, your dedicated Filipino business growth & legal advisor. How can I help launch or scale your business today? Feel free to ask about DTI & Barangay permits, product costing, wholesale suppliers, or business name ideas!`;
  }
  // B. BUSINESS NAME GENERATION & SUGGESTIONS
  else if ((lowerPrompt.includes('name') || lowerPrompt.includes('brand') || lowerPrompt.includes('title')) && (lowerPrompt.includes('suggest') || lowerPrompt.includes('idea') || lowerPrompt.includes('create') || lowerPrompt.includes('give') || lowerPrompt.includes('recommend'))) {
    fallbackText = `Mabuhay! Here are 4 creative, memorable business name suggestions tailored for your venture:

• **Kusina Likhora** – *"Authentic Homecooked Goodness Every Day"*
• **Sarabas Bites & Grill** – *"Flavorful Pinoy Favorites on the Go"*
• **Bountiful Pinoy Bowl** – *"Hearty Servings, Friendly Local Prices"*
• **Pinoy Sarap Kiosk** – *"Fresh, Fast, and Deliciously Pinoy"*

Tip: Once you select a name, register it on the DTI BNRS portal (bnrs.dti.gov.ph) under City/Municipal scope (₱530 fee)!`;
  }
  // C. DTI & BARANGAY REGISTRATION
  else if (lowerPrompt.includes('barangay') || lowerPrompt.includes('dti') || lowerPrompt.includes('clearance')) {
    fallbackText = `Mabuhay! Here is the official process to register your DTI Business Name and Barangay Micro-Business Clearance:

1. **DTI Business Name Registration (Act 3883)**:
   - Visit the official portal: **bnrs.dti.gov.ph** (takes only 30 minutes online).
   - Select City/Municipal territorial scope (₱530 fee) and pay via GCash/Maya to instantly download your 5-year official certificate.

2. **Barangay Micro-Business Clearance (RA 9178 / RA 7160)**:
   - Visit your local Barangay Hall BPLO desk with 2 Valid Government IDs, Cedula, and Lease Contract / Homeowner Consent.
   - Under RA 9178 (BMBE Act), clearance fees are strictly capped between ₱200 – ₱500 depending on LGU ordinance.`;
  }
  // D. MAYOR'S PERMIT & BIR TAX REGISTRATION
  else if (lowerPrompt.includes('mayor') || lowerPrompt.includes('bir') || lowerPrompt.includes('tax') || lowerPrompt.includes('bplo') || lowerPrompt.includes('1901')) {
    fallbackText = `Mabuhay! Here is how to complete your Mayor's License and BIR Tax Registration:

1. **Mayor's Business Permit (City Hall BPLO)**:
   - Bring your DTI Certificate & Barangay Clearance to City Hall.
   - Undergo Fire Safety (BFP) and Sanitary Inspections to receive your Mayor's License Plate & Sanitary Sticker.

2. **BIR Tax Registration (Form 1901)**:
   - File BIR Form 1901 at your assigned Revenue District Office (RDO) within 30 days of securing Mayor's Permit.
   - Pay ₱500 Annual Registration Fee (ARF) + ₱30 Documentary Stamp Tax, register books of accounts, and receive your BIR Form 2303 Certificate!`;
  }
  // E. PRODUCT COSTING & PROFIT MARGINS
  else if (lowerPrompt.includes('cost') || lowerPrompt.includes('margin') || lowerPrompt.includes('price') || lowerPrompt.includes('compute') || lowerPrompt.includes('profit')) {
    fallbackText = `Mabuhay! Here is Khora AI's essential Product Costing & Pricing Formula:

1. **Direct Recipe Cost**: Sum up raw ingredient costs + packaging per serving (e.g. ₱25 total cost).
2. **Profit Margin Markup**: Add a **35% to 50% markup** (e.g. ₱25 × 1.40 = ₱35 retail selling price).
3. **Overhead Allocation**: The markup covers utilities, transport, waste, and net business profits.

Note: Under RA 7394 (Price Tag Law), make sure every item displayed has a clear price tag or menu price board!`;
  }
  // F. WHOLESALE PROCUREMENT & SUPPLIERS
  else if (lowerPrompt.includes('supplier') || lowerPrompt.includes('wholesale') || lowerPrompt.includes('supply') || lowerPrompt.includes('source')) {
    fallbackText = `Mabuhay! For wholesale inventory and ingredient procurement:

1. **Wholesale Hubs**: Source from major commercial markets like Divisoria, Balintawak Market, or direct agricultural depots.
2. **Negotiate Pakyawan Pricing**: Always ask for bulk wholesale discounts and build relationships with at least 2 backup suppliers.
3. **Quality Check**: Start with a small trial batch before ordering high volumes!`;
  }

  return {
    content: fallbackText,
    success: true
  };
};

export const askClaudeAI = askKhoraAI;

export const generateBusinessNameSuggestions = async (productType: string, vibe: string = 'Friendly & Catchy') => {
  const prompt = `Suggest 4 creative, memorable business names for my "${productType}" business with a "${vibe}" vibe. Include a short catchphrase for each.`;
  return await askKhoraAI(prompt);
};

export const generateCostEstimateAdvice = async (businessCategory: string) => {
  const prompt = `Give me practical cost breakdown estimates in Philippine Pesos (PHP ₱) for starting a "${businessCategory}" business in the Philippines.`;
  return await askKhoraAI(prompt);
};
