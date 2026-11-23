/**
 * Link validation shared by the Blocks editor (admin) and the blocks entity validator (server).
 * Kept free of Node-only imports so the admin can load it via `@strapi/utils/blocks-link`.
 */

// Not exported, so no caller can widen the allow-list for every consumer
const ALLOWED_LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  'http:',
  'https:',
  'ftp:',
  'mailto:',
  'tel:',
]);

const hasAllowedProtocol = (url: string) => {
  try {
    return ALLOWED_LINK_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

/**
 * Relative (`/about`) and fragment-only (`#anchor`) links are resolved against a dummy
 * origin so the protocol allow-list still applies to them. A bare `#` points nowhere.
 */
export const isValidBlocksLink = (link: string) => {
  if (link === '#') {
    return false;
  }

  return hasAllowedProtocol(
    link.startsWith('/') || link.startsWith('#') ? `https://strapi.io${link}` : link
  );
};

/**
 * Stricter check used when pasting: only absolute URLs with an allowed protocol become links.
 */
export const isValidAbsoluteBlocksLink = (link: string) => hasAllowedProtocol(link);
