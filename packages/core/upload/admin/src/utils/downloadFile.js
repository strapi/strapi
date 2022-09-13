import axios from 'axios';

export const downloadFile = (url, fileName) => {
  axios({
    url,
    method: 'GET',
    responseType: 'blob',
  }).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', fileName);
    link.click();
  });
};
