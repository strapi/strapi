const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'ftp:', 'mailto:', 'tel:']);

const isValidLink = (link: string) => {
  try {
    const url = new URL(link.startsWith('/') ? `https://strapi.io${link}` : link);

    return ALLOWED_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

const isValidAbsoluteLink = (link: string) => {
  try {
    return ALLOWED_LINK_PROTOCOLS.has(new URL(link).protocol);
  } catch {
    return false;
  }
};

export { isValidLink, isValidAbsoluteLink };
