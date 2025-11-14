const capitalise = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

function getByteSize(value: string) {
  return new TextEncoder().encode(value).length;
}

export { capitalise, getByteSize };
