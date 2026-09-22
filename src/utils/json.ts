/**
 * Pulls the first balanced {...} block out of a reply, so a model that adds
 * a greeting or a ```json fence around the object still parses. Shared by
 * every advisor that asks Khora AI for JSON (pricingAdvisor, onboardingAdvisor,
 * supplierAdvisor, marketAnalysis).
 */
export const extractJsonObject = (text: string): any | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

export const toNumber = (value: any): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const cleanText = (value: any, maxLength: number): string =>
  typeof value === 'string'
    ? value.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
