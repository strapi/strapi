import axios from 'axios';

const urlToFile = async url => {
  try {
    const res = await axios.get(url, { responseType: 'blob', timeout: 8000 });
    const loadedFile = new File([res.data], res.config.url, {
      type: res.headers['content-type'],
    });

    return loadedFile;
  } catch (err) {
    err.displayMessage = {
      id: 'Settings.application.customization.modal.upload.error-network',
      defaultMessage: 'Network error',
    };

    throw err;
  }
};

export default urlToFile;
