'use strict';

/**
 * User.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

// Public dependencies.
const _ = require('lodash');
const bcrypt = require('bcryptjs');

module.exports = {

  /**
   * Promise to fetch all users.
   *
   * @return {Promise}
   */

  fetchAll: (params) => {
    return strapi.query('user', 'users-permissions').find(strapi.utils.models.convertParams('user', params));
  },

  /**
   * Promise to fetch a/an user.
   *
   * @return {Promise}
   */

  fetch: (params) => {
    return strapi.query('user', 'users-permissions').findOne(_.pick(params, '_id'));
  },

  /**
   * Promise to add a/an user.
   *
   * @return {Promise}
   */

  add: async (values) => {
    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    const data = await strapi.plugins['users-permissions'].models.user.create(_.omit(values, _.keys(_.groupBy(strapi.plugins['users-permissions'].models.user.associations, 'alias'))));
    await strapi.hook.mongoose.manageRelations('user', _.merge(_.clone(data), { values }));
    return data;
  },

  /**
   * Promise to edit a/an user.
   *
   * @return {Promise}
   */

  edit: async (params, values) => {
    // Note: The current method will return the full response of Mongo.
    // To get the updated object, you have to execute the `findOne()` method
    // or use the `findOneOrUpdate()` method with `{ new:true }` option.
    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    await strapi.hook.mongoose.manageRelations('user', _.merge(_.clone(params), { values }));
    return strapi.plugins['users-permissions'].models.user.update(params, values, { multi: true });
  },

  /**
   * Promise to remove a/an user.
   *
   * @return {Promise}
   */

  remove: async params => {
    // Note: To get the full response of Mongo, use the `remove()` method
    // or add spent the parameter `{ passRawResult: true }` as second argument.
    const data = await strapi.plugins['users-permissions'].models.user.findOneAndRemove(params, {})
      .populate(_.keys(_.groupBy(_.reject(strapi.plugins['users-permissions'].models.user.associations, {autoPopulate: false}), 'alias')).join(' '));

    _.forEach(User.associations, async association => {
      const search = (_.endsWith(association.nature, 'One')) ? { [association.via]: data._id } : { [association.via]: { $in: [data._id] } };
      const update = (_.endsWith(association.nature, 'One')) ? { [association.via]: null } : { $pull: { [association.via]: data._id } };

      await strapi.models[association.model || association.collection].update(
        search,
        update,
        { multi: true });
    });

    return data;
  },

  hashPassword: function (user = {}) {
    return new Promise((resolve) => {
      if (!user.password || this.isHashed(user.password)) {
        resolve(null);
      } else {
        bcrypt.hash(user.password, 10, (err, hash) => {
          resolve(hash)
        });
      }
    });
  },

  isHashed: (password) => {
    if (typeof password !== 'string' || !password) {
      return false;
    }

    return password.split('$').length === 4;
  },

  validatePassword: (password, hash) => {
    return bcrypt.compareSync(password, hash);
  }
};
