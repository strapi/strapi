'use strict';

/**
 * Schema languages dependencies
 */

// Public node modules
var _ = require('lodash');
var path = require('path');

// Local services
var SettingService = require('../SettingsService');
// var SocketService = require('../SocketService');

var SchemaLanguages = function(app) {
  var schema = {
    defaultLocale: {
      type: 'string',
      path: 'config/i18n.json',
      nested: 'i18n',
      resolver: function(rootValue, value, scope, cb) {
        if (_.includes(_.union(app.config.i18n.locales, rootValue.locales), value)) {
          return cb(null, value);
        }

        return cb('This locale doesn\'t exist', null);
      }
    },
    locales: {
      update: false,
      type: 'array',
      path: 'config/i18n.json',
      resolver: function(rootValue, value, scope, cb) {
        var arrayOfFiles = [];
        var localesToRemove = _.difference(app.config.i18n.locales, value);
        var localesToAdd = _.difference(value, _.difference(app.config.i18n.locales, localesToRemove));
        var defaultLocale = _.includes(app.config.i18n.locales, rootValue.defaultLocale) ? rootValue.defaultLocale : app.config.i18n.defaultLocale;

        SettingService.getFiles(app, [{
          path: path.resolve(app.config.appPath, 'config', 'locales', defaultLocale + '.json')}
        ])
          .then(function(files) {
            var arrayOfPromises = [];

            _.forEach(localesToAdd, function(locale) {
              var localePath = path.resolve(app.config.appPath, 'config', 'locales', locale + '.json');

              arrayOfPromises.push(SettingService.generateSetting(app, localePath, locale + '.json', files[0].value));
            });

            // Create new locale based on default locale
            return Promise.all(arrayOfPromises);
          })
          .then(function(files) {
            arrayOfFiles = _.union(arrayOfFiles, files);

            var arrayOfPathToRemove = [];

            _.forEach(localesToRemove, function(locale) {
              arrayOfPathToRemove.push({
                path: path.resolve(app.config.appPath, 'config', 'locales', locale + '.json')
              });
            });

            // Remove locales from local machine
            return SocketService.todo({
              action: 'removeFileOrFolder',
              from: app.token,
              to: app.config.studio.appId,
              toRemove: arrayOfPathToRemove
            });
          })
          .then(function() {
            return SocketService.zip(app.token, arrayOfFiles);
          })
          .then(function() {
            return SocketService.todo({
              from: app.token,
              to: app.config.studio.appId,
              files: arrayOfFiles
            });
          })
          .then(function() {
            cb(null, value);
          })
          .catch(function(errors) {
            cb(errors, null);
          });
      }
    }
  };

  return schema;
};

module.exports = SchemaLanguages;
