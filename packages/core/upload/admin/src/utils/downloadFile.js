import { getFetchClient } from '@strapi/helper-plugin';

export const downloadFile = async (url, fileName) => {
  const { get } = getFetchClient();
  const response = await get(
    url,
    {responseType: 'blob'}
  );
  const urlDownload = window.URL.createObjectURL(new Blob([response.data]));
  console.log('downloadFile url New', urlDownload);
  const link = document.createElement('a');

  link.href = urlDownload;
  link.setAttribute('download', fileName);
  console.log('downloadFile link New', link);
  link.click();
};
