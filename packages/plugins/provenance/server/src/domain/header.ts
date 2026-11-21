import type { ClientClaim } from './types';

const KNOWN_KEYS = ['source', 'action', 'model', 'agent'] as const;
const MAX_VALUE_LENGTH = 200;

/**
 * Splits on `;` outside double quotes. `,` separates repeated headers, which Node joins.
 */
const splitParameters = (value: string) => {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === '\\' && inQuotes && i + 1 < value.length) {
      current += char + value[i + 1];
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === ';' || char === ',') && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);

  return parts;
};

const unquote = (raw: string) => {
  const value = raw.trim();

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1');
  }

  return value;
};

/**
 * Parses `Strapi-Provenance: source=ai; model="claude-opus-5-5"; agent="seo-bot"`.
 *
 * The syntax follows the parameters of an RFC 9651 structured field (`key=value` pairs
 * separated by `;`, values are tokens or quoted strings). Unknown keys and malformed pairs
 * are ignored rather than rejected: the header only ever adds information.
 */
export const parseProvenanceHeader = (
  header: string | string[] | undefined
): ClientClaim | null => {
  if (header === undefined) {
    return null;
  }

  // Node decodes header bytes as latin1: read them back as UTF-8
  const raw = Buffer.from(Array.isArray(header) ? header.join(';') : header, 'latin1').toString(
    'utf8'
  );
  const claim: ClientClaim = {};

  for (const part of splitParameters(raw)) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim().toLowerCase();
    const value = unquote(part.slice(separator + 1));

    // A repeated `source` cannot take back an AI declaration
    if (key === 'source' && claimsAi(claim)) {
      continue;
    }

    if ((KNOWN_KEYS as readonly string[]).includes(key) && value !== '') {
      claim[key as (typeof KNOWN_KEYS)[number]] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }

  return Object.keys(claim).length > 0 ? claim : null;
};

/**
 * Validates the `provenance` key of a content API body: `{ [field]: ClientClaim }`.
 */
export const parseBodyClaims = (value: unknown): Record<string, ClientClaim> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  // No prototype: a `__proto__` field name stays a plain key
  const claims = Object.create(null) as Record<string, ClientClaim>;

  for (const [field, rawClaim] of Object.entries(value)) {
    if (rawClaim === null || typeof rawClaim !== 'object' || Array.isArray(rawClaim)) {
      continue;
    }

    const claim: ClientClaim = {};

    for (const key of KNOWN_KEYS) {
      const claimValue = (rawClaim as Record<string, unknown>)[key];

      if (typeof claimValue === 'string' && claimValue !== '') {
        claim[key] = claimValue.slice(0, MAX_VALUE_LENGTH);
      }
    }

    claims[field] = claim;
  }

  return claims;
};

const AI_SOURCES = new Set(['ai', 'ai-generated', 'ai-assisted']);

/**
 * A claim only counts when it declares AI. Anything else (`human`, `import`, typos) cannot
 * lower what the server already knows, so it is dropped. The plugin's own source names are
 * accepted too.
 */
export const claimsAi = (claim: ClientClaim | null | undefined) => {
  return AI_SOURCES.has(claim?.source?.toLowerCase() ?? '');
};

/**
 * The claim says the AI edited existing content rather than wrote it.
 */
export const claimsEdit = (claim: ClientClaim | null | undefined) => {
  return (
    claim?.action?.toLowerCase() === 'edited' || claim?.source?.toLowerCase() === 'ai-assisted'
  );
};
