const openWithNewTab = (path) => {
  const url = (() => {
    if (path.startsWith('/')) {
      return `${strapi.backendURL}${path}`;
    }

    if (path.startsWith('http')) {
      return path;
    }

    return `${strapi.backendURL}/${path}`;
  })();

  window.open(url, '_blank');

  return window.focus();
};

export default openWithNewTab;
