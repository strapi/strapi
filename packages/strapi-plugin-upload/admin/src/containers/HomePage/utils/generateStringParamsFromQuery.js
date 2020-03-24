const generateStringParamsFromQuery = query => {
  let params = '';

  query.forEach((value, key) => {
    if (key.includes('mime') && value === 'file') {
      const revertedKey = key.includes('_ncontains') ? 'mime_contains' : 'mime_ncontains';
      const param = `${revertedKey}=image&${revertedKey}=video`;

      params += `&${param}`;
    } else {
      const param = `${key}=${value}`;

      params += `&${param}`;
    }
  });

  return params.substring(1);
};

export default generateStringParamsFromQuery;
