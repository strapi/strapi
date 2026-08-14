const GENERIC_MIMES = new Set(['', 'application/octet-stream']);

/**
 * Extensions Windows/browsers often report as application/octet-stream.
 * Kept in the admin bundle so we do not pull Node `mime-types`/`path` into the UI.
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  mpe: 'video/mpeg',
  wmv: 'video/x-ms-wmv',
  avi: 'video/x-msvideo',
  flv: 'video/x-flv',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
  '3gp': 'video/3gpp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wma: 'audio/x-ms-wma',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  avif: 'image/avif',
};

const filenameExtension = (filename: string): string => {
  const base = filename.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');

  if (dot <= 0 || dot === base.length - 1) {
    return '';
  }

  return base.slice(dot + 1).toLowerCase();
};

/**
 * When the client MIME is missing or generic, infer a real type from the filename.
 * Used so video-only media fields accept .mov on Windows (GitHub #23788).
 */
export const resolveFileMime = (mime?: string | null, filename?: string | null): string => {
  const declared = (mime ?? '').trim().split(';')[0].trim();

  if (declared && !GENERIC_MIMES.has(declared.toLowerCase())) {
    return declared;
  }

  if (!filename) {
    return declared;
  }

  const fromExt = EXTENSION_TO_MIME[filenameExtension(filename)];

  return fromExt || declared;
};
