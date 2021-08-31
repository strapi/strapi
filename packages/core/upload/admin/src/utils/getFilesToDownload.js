const getFilesToDownload = files => {
  return files.filter(file => file.isDownloading === true);
};

export default getFilesToDownload;
