const capitalise = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

function getByteSize(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }

  // Manual UTF-8 encoding (fully reliable fallback)
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    if (code < 0x80) {
      bytes += 1; // ASCII (1 byte)
    } else if (code < 0x800) {
      bytes += 2; // 2-byte UTF-8
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate (part of surrogate pair)
      if (i + 1 < value.length) {
        const nextCode = value.charCodeAt(i + 1);
        if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
          // Valid surrogate pair (4-byte UTF-8)
          bytes += 4;
          i++; // Skip next code unit
          continue;
        }
      }
      bytes += 3; // Unmatched high surrogate → treated as 3-byte UTF-8
    } else if (code < 0x10000) {
      bytes += 3; // 3-byte UTF-8
    } else {
      bytes += 4; // 4-byte UTF-8
    }
  }
  return bytes;
}

export { capitalise, getByteSize };
