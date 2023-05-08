const addPrependingSlash = (url) => {
  if (typeof url === 'string' && url.charAt(0) !== '/') {
    url = '/' + url;
  }
  return url;
}

export default addPrependingSlash;