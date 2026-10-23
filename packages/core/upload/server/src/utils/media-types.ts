/**
 * Server copy of `admin/src/utils/allowedMediaTypes.ts`: the `allowedTypes` values a
 * `media` attribute can carry, and the mime prefix each one stands for. `files` is the
 * catch-all: anything that is not an image, video or audio. Keep the two in sync, so a
 * file the admin lets you pick for a field is one the server accepts there too.
 */
export type AllowedMediaType = 'files' | 'images' | 'videos' | 'audios';

const MEDIA_KINDS = ['image', 'video', 'audio'] as const;

const SINGULAR: Record<AllowedMediaType, string> = {
  files: 'file',
  images: 'image',
  videos: 'video',
  audios: 'audio',
};

const LABELS: Record<AllowedMediaType, string> = {
  files: 'files',
  images: 'images',
  videos: 'videos',
  audios: 'audio',
};

/** A field's `allowedTypes` in words, e.g. "images or videos". */
export const describeMediaTypes = (allowedTypes: AllowedMediaType[]): string =>
  allowedTypes.map((type) => LABELS[type] ?? type).join(' or ');

/**
 * Whether a mime type satisfies a field's `allowedTypes`.
 *
 * No `allowedTypes` means the field takes anything. A file with no mime is only
 * allowed where `files` is, since nothing places it in one of the three media
 * kinds.
 */
export const isMediaTypeAllowed = (
  allowedTypes: AllowedMediaType[] | null | undefined,
  mime: string | null | undefined
): boolean => {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true;
  }

  const singularTypes = new Set(
    allowedTypes.map((type) => SINGULAR[type]).filter((type): type is string => Boolean(type))
  );
  const kind = mime?.split('/')[0].trim().toLowerCase();

  if (!kind) {
    return singularTypes.has('file');
  }

  if (singularTypes.has('file') && !MEDIA_KINDS.includes(kind as (typeof MEDIA_KINDS)[number])) {
    return true;
  }

  return singularTypes.has(kind);
};
