const getFilesToDownload = files => {
  return files.filter(file => file.isDownloading);
};

export default getFilesToDownload;
