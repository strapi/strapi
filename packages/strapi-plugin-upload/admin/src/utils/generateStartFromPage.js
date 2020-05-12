const generateStartFromPage = (page, limit) => {
  return page * limit - limit;
};

export default generateStartFromPage;
