const capitalise = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

function getByteSize(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }

  // Fallback: Count bytes manually (assuming most non-ASCII chars are 2+ bytes)
  return value.split('').reduce((sum, char) => sum + (char.charCodeAt(0) > 127 ? 2 : 1), 0);
}

export { capitalise, getByteSize };
