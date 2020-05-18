module.exports = {
  create(params) {
    return strapi.query('role', 'admin').create(params);
  },
  fetch(params) {
    return strapi.query('role', 'admin').findOne(params);
  },
};
