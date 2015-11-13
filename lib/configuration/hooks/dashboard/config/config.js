'use strict';

/**
 * Returns the config for the dashboard.
 */

module.exports = function * () {
  let user;
  let isAdmin = false;

  try {
    user = yield strapi.api.user.services.jwt.getToken(this, true);

    if (user && user.id) {
      // Find the user in the database.
      user = yield strapi.orm.collections.user.findOne(user.id).populate('roles');

      // Check if the user has the role `admin`.
      isAdmin = _.findWhere(user.roles, {name: 'admin'});
      if (!isAdmin) {
        this.status = 403;
        this.body = {
          message: 'You must be have the role admin to get the config of the app.'
        };
        return;
      }
    }
  } catch (err) {

  }

  try {
    // Init output object.
    const output = {};

    // Set the config.
    output.settings = {};
    output.settings.url = strapi.config.url;

    // Define if the app is considered as new.
    const userCount = yield strapi.orm.collections.user.count();
    output.settings.isNewApp = !userCount;

    // User is not connected.
    if (!user) {
      output.connected = false;
      this.body = output;
      return;
    } else {
      output.connected = true;
    }

    // i18n config.
    output.settings.i18n = strapi.config.i18n;

    // Set the models.
    output.models = strapi.models;

    // Delete `toJSON` attribute in every models.
    _.forEach(output.models, function (model) {
      delete model.attributes.toJSON;
    });

    // Format `config.api` for multi templates models.
    _.forEach(strapi.api, function (api, key) {
      if (api.templates) {
        output.models[key].templates = {};
      }

      // Assign the template attributes with the model attributes.
      _.forEach(api.templates, function (template, templateName) {
        output.models[key].templates[templateName] = {};
        output.models[key].templates[templateName].attributes = {};
        _.forEach(template.attributes, function (value, attributeKey) {
          output.models[key].templates[templateName].attributes[attributeKey] = _.cloneDeep(output.models[key].attributes[attributeKey]);
        });
        output.models[key].templates[templateName].displayedAttribute = template.displayedAttribute;
      });
    });

    // Finally send the result in the callback.
    this.body = output;
  } catch (err) {
    this.status = 500;
    this.body = err;
  }
};
