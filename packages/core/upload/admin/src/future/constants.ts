/**
 * Upper bound on a single synchronous AI metadata request.
 *
 * Mirrors `AI_METADATA_MAX_FILES` in the upload server constants — the server
 * is authoritative and rejects anything larger with a 400. This copy exists so
 * the UI can disable the action up front instead of letting the user discover
 * the limit through a failed request.
 */
export const AI_METADATA_MAX_FILES = 40;
