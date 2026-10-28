/**
 * Constants shared by the upload server and the admin panel.
 *
 * The server stays authoritative — it validates and rejects — but the admin
 * needs the same values to disable actions up front rather than letting the
 * user discover a limit through a failed request.
 */

/**
 * Image formats the AI metadata provider can read.
 *
 * Anything outside this list (non-images, but also exotic image formats like
 * SVG or TIFF) is reported as `skipped` instead of being sent.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-understanding
 */
export const AI_METADATA_SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type AIMetadataSupportedImageType = (typeof AI_METADATA_SUPPORTED_IMAGE_TYPES)[number];

/**
 * Whether the AI metadata provider can generate metadata for this mime type.
 */
export const isAIMetadataSupportedMime = (mime?: string | null): boolean =>
  AI_METADATA_SUPPORTED_IMAGE_TYPES.includes(mime as AIMetadataSupportedImageType);

/**
 * Number of images sent to the AI server per request when generating metadata
 * for an explicit selection. Matches the URL cap of the bulk URL upload flow.
 */
export const AI_METADATA_CHUNK_SIZE = 20;

/**
 * Upper bound on a single synchronous AI metadata request.
 *
 * The selection is processed in sequential chunks inside one HTTP request, so
 * an unbounded selection means an unbounded request — long past most proxy and
 * load balancer timeouts, with no way for the client to learn what was written.
 * Rejecting with a 400 lets the UI ask for a smaller selection instead.
 */
export const AI_METADATA_MAX_FILES = AI_METADATA_CHUNK_SIZE * 2;
