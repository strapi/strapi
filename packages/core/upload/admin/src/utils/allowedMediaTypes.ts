/**
 * The `allowedTypes` values a `media` attribute can carry, and the mime prefix
 * each one stands for. `files` is the catch-all: anything that is not an image,
 * video or audio.
 */
export type AllowedMediaType = 'files' | 'images' | 'videos' | 'audios';

const MEDIA_KINDS = ['image', 'video', 'audio'] as const;

const SINGULAR: Record<AllowedMediaType, string> = {
  files: 'file',
  images: 'image',
  videos: 'video',
  audios: 'audio',
};

/**
 * Whether a mime type satisfies a field's `allowedTypes`.
 *
 * No `allowedTypes` means the field takes anything. A file with no mime is only
 * allowed where `files` is, since nothing places it in one of the three media
 * kinds.
 */
export const isMediaTypeAllowed = (
  allowedTypes: AllowedMediaType[] | null | undefined,
  mime: string | undefined
): boolean => {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true;
  }

  const singularTypes = allowedTypes.map((type) => SINGULAR[type]).filter(Boolean);
  const kind = mime?.split('/')[0];

  if (!kind) {
    return singularTypes.includes('file');
  }

  if (
    singularTypes.includes('file') &&
    !MEDIA_KINDS.includes(kind as (typeof MEDIA_KINDS)[number])
  ) {
    return true;
  }

  return singularTypes.includes(kind);
};

/** The subset of `files` this field accepts, in the order they were given. */
export const filterAllowedFiles = (
  allowedTypes: AllowedMediaType[] | null | undefined,
  files: globalThis.File[]
): globalThis.File[] => files.filter((file) => isMediaTypeAllowed(allowedTypes, file.type));
