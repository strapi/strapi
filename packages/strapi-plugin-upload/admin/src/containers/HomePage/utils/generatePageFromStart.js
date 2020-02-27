const generateStartFromPage = (page, limit) => {
  return Math.floor(page / limit) + 1;
};

export default generateStartFromPage;
