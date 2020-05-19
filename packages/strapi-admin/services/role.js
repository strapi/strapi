module.exports = {
  /**
   * Create and save a role in database
   * @param attributes A partial role object
   * @returns {Promise<role>}
   */
  create(attributes) {
    return strapi.query('role', 'admin').create(attributes);
  },

  /**
   * fetch a role in database
   * @param params query params to find the role
   * @returns {Promise<user>}
   */
  fetch(params) {
    return strapi.query('role', 'admin').findOne(params);
  },
};
