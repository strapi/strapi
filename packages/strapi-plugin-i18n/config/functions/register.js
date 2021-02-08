'use strict';

const _ = require('lodash');

// add a register function to do some stuff after the loading but before the boot
module.exports = () => {
  // need to add some logic to the db layer so we can add fields to the models

  Object.values(strapi.models).forEach(model => {
    if (_.get(model, 'pluginOptions.i18n.enabled', false) === true) {
      // find a way to specify the id to use in the relations or compo relations
      // model.relationalId = 'strapi_id';
      // model.attributes.compo.relationalId = 'strapi_id';

      _.set(model.attributes, 'strapi_id', {
        writable: true,
        private: false,
        configurable: false,
        type: 'string',
      });

      _.set(model.attributes, 'localizations', {
        writable: true,
        private: false,
        configurable: false,
        type: 'json',
      });

      _.set(model.attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        type: 'string',
        default: 'en-US',
      });
    }
  });

  // strapi.database.migrations.push({
  //   before() {
  //     // if model had i18N but doesn't anymore
  //     // on enable
  //     // -> set locale to default locale
  //     // -> init localizations json
  //     // -> init strapiId
  //     // on disabled
  //     // -> delete data not in default locale
  //     // -> remove default locale ?
  //     // needed operations
  //   },
  //   after() {
  //     // delete la data
  //     // deleteColumn('locale');
  //   },
  // });
};

/**
 *
 * migrer de la data sans changer le schema de bdd
 * puis migrer le schema de bdd
 *
 * Content Type 1 -> Content Type 1.1
 * Content Type 1 (i18N enabled) -> add des attributes (locale, localizations) -> set les default values
 * Content Type 1.1 (i18n disabled) -> delete la data -> remove les attributes
 *
 * Migrations:
 *  before -> migrationSchema -> after
 *
 * before -> oldSchema (from db) - migration - newSchema (from file) -> after
 *
 *
 * i18n:
 *
 * (oldSchema, newSchema) ->
 *  is i18n enabled & disabled before ?
 *    -> add attributes to new schema (add columns) ? (or already added)
 *    -> set new attributes to default values
 *
 *  is i18n disabled & enabled before ?
 *    -> delete data
 *    -> remove attributes (delete columns)
 */
