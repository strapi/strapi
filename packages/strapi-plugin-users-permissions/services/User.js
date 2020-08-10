'use strict';

/**
 * User.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const bcrypt = require('bcryptjs');

module.exports = {
  /**
   * Promise to count users
   *
   * @return {Promise}
   */

  count(params) {
    return strapi.query('user', 'users-permissions').count(params);
  },

  /**
   * Promise to search count users
   *
   * @return {Promise}
   */

  countSearch(params) {
    return strapi.query('user', 'users-permissions').countSearch(params);
  },

  /**
   * Promise to add a/an user.
   * @return {Promise}
   */
  async add(values) {
    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(
        values
      );
    }

    return strapi.query('user', 'users-permissions').create(values);
  },

  /**
   * Promise to edit a/an user.
   * @return {Promise}
   */
  async edit(params, values) {
    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(
        values
      );
    }

    return strapi.query('user', 'users-permissions').update(params, values);
  },

  /**
   * Promise to fetch a/an user.
   * @return {Promise}
   */
  fetch(params, populate) {
    return strapi.query('user', 'users-permissions').findOne(params, populate);
  },

  /**
   * Promise to fetch authenticated user.
   * @return {Promise}
   */
  fetchAuthenticatedUser(id) {
    return strapi.query('user', 'users-permissions').findOne({ id }, ['role']);
  },

  /**
   * Promise to fetch all users.
   * @return {Promise}
   */
  fetchAll(params, populate) {
    return strapi.query('user', 'users-permissions').find(params, populate);
  },

  hashPassword(user = {}) {
    return new Promise(resolve => {
      if (!user.password || this.isHashed(user.password)) {
        resolve(null);
      } else {
        bcrypt.hash(`${user.password}`, 10, (err, hash) => {
          resolve(hash);
        });
      }
    });
  },

  isHashed(password) {
    if (typeof password !== 'string' || !password) {
      return false;
    }

    return password.split('$').length === 4;
  },

  /**
   * Promise to remove a/an user.
   * @return {Promise}
   */
  async remove(params) {
    return strapi.query('user', 'users-permissions').delete(params);
  },

  async removeAll(params) {
    return strapi.query('user', 'users-permissions').delete(params);
  },

  validatePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  },
};
