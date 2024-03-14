const getFileExtension = (ext) => (ext && ext[0] === '.' ? ext.substring(1) : ext);

export default getFileExtension;
