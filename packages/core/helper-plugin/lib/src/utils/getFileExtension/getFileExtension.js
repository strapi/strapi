const getFileExtension = (ext) => (ext && ext[0] === '.' ? ext.substr(1) : ext);

export default getFileExtension;
