const createFileToDownloadName = ({ file: { ext }, fileInfo: { name } }) => {
  return `${name.replace(ext, '')}${ext}`;
};

export default createFileToDownloadName;
