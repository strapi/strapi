const generateParamsFromQuery = query => {
  const params = {
    _limit: 10,
    _start: 0,
  };

  query.forEach((value, key) => {
    params[key] = value;
  });

  return params;
};

export default generateParamsFromQuery;
