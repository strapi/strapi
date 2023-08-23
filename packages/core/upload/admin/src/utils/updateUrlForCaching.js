import { URL } from 'url';

const updateUrlForCaching = (urlString, updatedAt) => {
  if (updatedAt) {
    const url = new URL(urlString);
    const urlParams = url.searchParams;
    urlParams.append('updatedAt', updatedAt);

    return url.toString();
  }

  return urlString;
};

export default updateUrlForCaching;
