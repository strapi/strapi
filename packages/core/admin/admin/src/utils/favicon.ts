/**
 * Sets the favicon in the document head
 */
const setFavicon = (faviconUrl: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const updateFavicon = () => {
    // Remove existing favicon links
    document.querySelectorAll("link[rel*='icon']").forEach((link) => link.remove());

    // Create and append new favicon link
    const link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  };

  // Set immediately if DOM is ready, otherwise wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFavicon);
  } else {
    updateFavicon();
  }
};

export { setFavicon };
