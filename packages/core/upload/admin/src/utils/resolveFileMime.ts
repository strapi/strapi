const GENERIC_MIMES = new Set(['', 'application/octet-stream']);

/**
 * Same window the server uses in mime-validation (`readFileChunk(..., 4100)`).
 * Magic-number detection only needs the start of the file.
 */
const FILE_TYPE_SNIFF_BYTES = 4100;

export const normalizeDeclaredMime = (mime?: string | null): string =>
  (mime ?? '').trim().split(';')[0].trim();

export const isGenericMime = (mime?: string | null): boolean => {
  const declared = normalizeDeclaredMime(mime);

  return !declared || GENERIC_MIMES.has(declared.toLowerCase());
};

const readBlobBytes = async (blob: Blob): Promise<Uint8Array> => {
  const chunk = typeof blob.slice === 'function' ? blob.slice(0, FILE_TYPE_SNIFF_BYTES) : blob;

  if (typeof chunk.arrayBuffer === 'function') {
    return new Uint8Array(await chunk.arrayBuffer());
  }

  // jsdom's Blob.slice() result has no arrayBuffer(); FileReader works in browsers and tests.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(chunk);
  });
};

/**
 * Detect MIME from file bytes (file-type), matching the server.
 * Returns undefined when the blob cannot be read or the type is unknown.
 */
export const detectMimeFromBlob = async (blob: Blob): Promise<string | undefined> => {
  try {
    const buffer = await readBlobBytes(blob);
    // Browser/core build — do not pull the Node `file-type` entry into the admin bundle.
    const { fileTypeFromBuffer } = await import('file-type/core');
    const result = await fileTypeFromBuffer(buffer);

    return result?.mime;
  } catch {
    return undefined;
  }
};

/**
 * When the browser MIME is missing or generic, sniff the file contents.
 * If there is no blob (library assets) or detection fails, keep the declared type.
 */
export const resolveFileMime = async (
  mime?: string | null,
  blob?: Blob | null
): Promise<string> => {
  const declared = normalizeDeclaredMime(mime);

  if (declared && !isGenericMime(declared)) {
    return declared;
  }

  if (blob) {
    const detected = await detectMimeFromBlob(blob);

    if (detected) {
      return detected;
    }
  }

  return declared;
};
