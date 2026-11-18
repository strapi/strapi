/**
 * Link validation shared by the Blocks editor (admin) and the blocks entity validator (server).
 * Kept free of Node-only imports so the admin can load it via `@strapi/utils/blocks-link`.
 */
export const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'ftp:', 'mailto:', 'tel:']);

/**
 * Relative (`/about`) and fragment-only (`#anchor`) links are resolved against a dummy
 * origin so the protocol allow-list still applies to them.
 */
export const isValidBlocksLink = (link: string) => {
  try {
    const url = new URL(
      link.startsWith('/') || link.startsWith('#') ? `https://strapi.io${link}` : link
    );

    return ALLOWED_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};
