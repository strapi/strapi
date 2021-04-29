const canDownloadFile = fileURL => typeof fileURL === 'string' && fileURL.startsWith('/');

export default canDownloadFile;
