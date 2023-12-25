/**
 * Get the file extension of value passed in.
 *
 * This hook is used to create URL aware of the backend. Practical to resolve assets.
 */
export const getFileExtension = (ext: string) => (ext && ext[0] === '.' ? ext.substr(1) : ext);
