module.exports = {
  fetch(params) {
    return strapi.query('role', 'admin').findOne(params);
  },
};
