import byteSize from 'byte-size';

const MAX_URLS = 20;

/**
 * Formats a byte value into a human-readable string with units.
 *
 * @param receivedBytes - The number of bytes to format (as number or string)
 * @param decimals - The number of decimal places to display (default: 0)
 * @returns A formatted string with value and unit (e.g., "1.5MB")
 *
 * @example
 * ```ts
 * formatBytes(1024) // '1KB'
 * formatBytes(1536, 1) // '1.5KB'
 * ```
 */
export function formatBytes(receivedBytes: number | string, decimals = 0) {
  const realBytes = typeof receivedBytes === 'string' ? Number(receivedBytes) : receivedBytes;
  const { value, unit } = byteSize(realBytes * 1000, { precision: decimals });

  if (!unit) {
    return '0B';
  }

  return `${value}${unit.toUpperCase()}`;
}

/**
 * Extracts the file extension from a string, removing the leading dot if present.
 *
 * @param ext - The file extension string (may include leading dot)
 * @returns The extension without leading dot, or the original value if no dot
 *
 * @example
 * ```ts
 * getFileExtension('.jpg') // 'jpg'
 * getFileExtension('png') // 'png'
 * ```
 */
export const getFileExtension = (ext?: string | null) =>
  ext && ext[0] === '.' ? ext.substring(1) : ext;

/**
 * Prefixes a relative file URL with the backend URL if needed.
 *
 * @param fileURL - The file URL to potentially prefix
 * @returns The full URL with backend prefix if it was relative, otherwise unchanged
 *
 * @example
 * ```ts
 * prefixFileUrlWithBackendUrl('/uploads/image.jpg') // 'http://localhost:1337/uploads/image.jpg'
 * prefixFileUrlWithBackendUrl('https://cdn.example.com/image.jpg') // 'https://cdn.example.com/image.jpg'
 * ```
 */
export const prefixFileUrlWithBackendUrl = (fileURL?: string) => {
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};

/**
 * Extracts a filename from a URL's pathname.
 *
 * @param url - The URL to extract the filename from
 * @returns The filename extracted from the URL path, or 'file' if none found
 *
 * @example
 * ```ts
 * getFilenameFromUrl('https://example.com/images/photo.jpg') // 'photo.jpg'
 * getFilenameFromUrl('https://example.com/') // 'file'
 * ```
 */
export function getFilenameFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const filename = pathname.split('/').pop();
  return filename || 'file';
}

/**
 * Validates a newline-separated string of URLs.
 *
 * @param urlsString - A string containing URLs separated by newlines
 * @returns An object with validated URLs array and optional error message
 *
 * @example
 * ```ts
 * const { urls, error } = validateUrls('https://example.com/a.jpg\nhttps://example.com/b.jpg');
 * if (error) {
 *   console.error(error);
 * } else {
 *   console.log(urls); // ['https://example.com/a.jpg', 'https://example.com/b.jpg']
 * }
 * ```
 */
export function validateUrls(urlsString: string): { urls: string[]; error: string | null } {
  const urls = urlsString
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    return { urls: [], error: 'Please provide at least one URL' };
  }

  if (urls.length > MAX_URLS) {
    return { urls: [], error: `Maximum ${MAX_URLS} URLs allowed` };
  }

  const invalidUrls: string[] = [];
  for (const url of urls) {
    try {
      new URL(url);
    } catch {
      invalidUrls.push(url);
    }
  }

  if (invalidUrls.length > 0) {
    const message =
      invalidUrls.length === 1
        ? `Invalid URL: ${invalidUrls[0]}`
        : `${invalidUrls.length} invalid URLs found`;
    return { urls: [], error: message };
  }

  return { urls, error: null };
}
