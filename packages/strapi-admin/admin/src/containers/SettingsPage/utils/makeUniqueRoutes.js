const makeUniqueRoutes = routes =>
  routes.filter((route, index, refArray) => {
    return refArray.findIndex(obj => obj.key === route.key) === index;
  });

export default makeUniqueRoutes;
