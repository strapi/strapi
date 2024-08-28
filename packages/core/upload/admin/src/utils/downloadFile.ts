export const downloadFile = async (url: string, fileName: string) => {
  const fileBlob = await fetch(url).then((res) => res.blob());
  const urlDownload = window.URL.createObjectURL(fileBlob);
  const link = document.createElement('a');

  link.href = urlDownload;
  link.setAttribute('download', fileName);
  link.click();
};
