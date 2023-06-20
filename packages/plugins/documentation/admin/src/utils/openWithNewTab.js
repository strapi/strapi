const openWithNewTab = (path) => {
  const url = (() => {
    if (path.startsWith('/')) {
      return `${window.strapi.backendURL}${path}`;
    }

    if (path.startsWith('http')) {
      return path;
    }

    return `${window.strapi.backendURL}/${path}`;
  })();

  window.open(url, '_blank');

  return window.focus();
};

export default openWithNewTab;
