'use strict';

/**
 * Returns the config for the dashboard.
 */

module.exports = function * () {

  try {
    // Init output object.
    const output = {};

    // Set the config.
    output.settings = {
      url: strapi.config.url,
      i18n: strapi.config.i18n
    };

    // Set the models.
    output.models = strapi.models;

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

    // User count.
    const promises = [];
    promises.push(strapi.orm.collections.user.count());

    // Execute promises.
    const response = yield promises;

    // Define if the app is considered as new.
    const userCount = response[0];
    output.settings.isNewApp = !userCount;

    // Finally send the result in the callback.
    this.body = output;
  } catch (err) {
    this.status = 500;
    this.body = err;
  }
};
