/**
 * Strict Undefined-Stripping Utility (Zero-Crash Payload Hygiene)
 * Recursively removes all `undefined` values from an object or array
 * before submitting to Firestore or other database SDKs.
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizePayload(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = sanitizePayload(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Regular expression patterns for detecting sensitive Personally Identifiable Information (PII)
 * and authentication credentials.
 */
export const PII_PATTERNS = {
  bearerToken: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi,
  apiKey: /\b(AIza[0-9A-Za-z_-]{35}|sk-[a-zA-Z0-9_-]{20,})\b/g,
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{13,19}\b/g,
  ssn: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g,
};

/**
 * Scrubs Personally Identifiable Information (PII) and secret credentials from raw text.
 */
export function scrubPII(text: string): string {
  if (typeof text !== 'string') return '';

  return text
    .replace(PII_PATTERNS.bearerToken, '[TOKEN REDACTED]')
    .replace(PII_PATTERNS.apiKey, '[API_KEY REDACTED]')
    .replace(PII_PATTERNS.creditCard, '[CREDIT CARD REDACTED]')
    .replace(PII_PATTERNS.ssn, '[SSN REDACTED]')
    .replace(PII_PATTERNS.email, '[EMAIL REDACTED]')
    .replace(PII_PATTERNS.phone, '[PHONE REDACTED]');
}

/**
 * Sanitizes an entire data structure: strips undefined values and scrubs PII from string values.
 */
export function sanitizeAndScrubPayload<T>(obj: T): T {
  const sanitized = sanitizePayload(obj);
  return scrubNestedStrings(sanitized);
}

function scrubNestedStrings<T>(obj: T): T {
  if (typeof obj === 'string') {
    return scrubPII(obj) as unknown as T;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => scrubNestedStrings(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = scrubNestedStrings(value);
  }
  return result as T;
}
