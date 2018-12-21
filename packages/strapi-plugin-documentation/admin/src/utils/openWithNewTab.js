import { startsWith } from 'lodash';

const openWithNewTab = (path) => {
  const url = (() => {
    if (startsWith(path, '/')) {
      return `${strapi.backendURL}${path}`;
    } else if (startsWith(path, 'https') || startsWith(path, 'http')) {
      return path;
    } else {
      return `${strapi.backendURL}/${path}`;
    }
  })();

  window.open(url, '_blank');

  return window.focus();
};

export default openWithNewTab;