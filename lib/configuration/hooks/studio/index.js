'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const crypto = require('crypto');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const io = require('socket.io-client');
const request = require('request');
const RSA = require('node-rsa');
const stringify = require('json-stringify-safe');
const unzip = require('unzip2');

/**
 * Studio hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      studio: {
        enabled: true,
        secretKey: ''
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      const _self = this;
      let firstConnectionAttempt = true;

      if (_.isPlainObject(strapi.config.studio) && !_.isEmpty(strapi.config.studio) && strapi.config.studio.enabled === true) {
        const manager = io.Manager(strapi.config.studio.url, {
          reconnectionDelay: 2000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        const socket = io.connect(strapi.config.studio.url, {
          'reconnection': true,
          'force new connection': true,
          'transports': [
            'polling',
            'websocket',
            'htmlfile',
            'xhr-polling',
            'jsonp-polling'
          ]
        });

        manager.on('connect_failed', function () {
          if (firstConnectionAttempt) {
            strapi.log.warn('Connection to the Studio server failed!');
          }
        });

        manager.on('reconnect_failed', function () {
          strapi.log.warn('Reconnection to the Studio server failed!');
        });

        manager.on('reconnect', function () {
          strapi.log.info('Connection to the Studio server found, please wait a few seconds...');
        });

        manager.on('reconnecting', function (number) {
          strapi.log.warn('Connection error with the Studio server, new attempt in progress... (' + number + ')');
        });

        socket.on('connect', function () {
          strapi.log.info('Connection with the Studio server found, please wait a few seconds...');
          firstConnectionAttempt = false;
          _self.connectWithStudio(socket);
        });

        socket.on('error', function (err) {
          strapi.log.warn(err);
        });

        socket.on('disconnect', function () {
          strapi.log.info('Disconnected from the Studio server.');
        });

        socket.on('authorized', function (data) {
          const decryptedData = strapi.rsa.decryptPublic(data, 'json');

          if (decryptedData.status === 'ok') {
            if (strapi.config.environment === 'development') {
              socket.emit('testEncryption', {
                appId: strapi.config.studio.appId,
                token: strapi.token,
                encrypted: strapi.rsa.encrypt({
                  secretKey: strapi.config.studio.secretKey,
                  data: 'ok'
                })
              }, function (err) {
                if (err) {
                  strapi.log.warn(err);
                }

                strapi.log.info('Connected with the Studio server.');
              });
            } else {
              socket.emit('testEncryption', {
                appId: strapi.config.studio.appId,
                env: strapi.config.environment,
                encrypted: strapi.rsa.encrypt({
                  secretKey: strapi.config.studio.secretKey,
                  data: 'ok'
                })
              }, function (err) {
                if (err) {
                  strapi.log.warn(err);
                }

                strapi.log.info('Connected with the Studio server.');
              });
            }
          }
        });

        socket.on('todo', function (data, fn) {
          if (!data.hasOwnProperty('from') || !data.hasOwnProperty('to')) {
            fn(stringify('Some required attributes are missing', null, 2), null);
          } else if (data.from === strapi.token) {
            if (data.hasOwnProperty('files')) {
              const syncPromise = function (file, index) {
                const deferred = Promise.defer();

                _self.unzipper(file)
                  .then(function () {
                    if (!_.isEmpty(data.files[index + 1])) {
                      return syncPromise(data.files[index + 1], index + 1);
                    } else {
                      deferred.resolve();
                    }
                  })
                  .then(function () {
                    deferred.resolve();
                  })
                  .catch(function (err) {
                    deferred.reject(err);
                  });

                return deferred.promise;
              };

              syncPromise(_.first(data.files), 0)
                .then(function () {
                  if (data.hasOwnProperty('action') && _.isFunction(_self[data.action])) {
                    _self[data.action](data, function (err, obj) {
                      if (err) {
                        fn({
                          appId: strapi.config.studio.appId,
                          token: strapi.token,
                          encrypted: strapi.rsa.encrypt({
                            err: stringify(err, null, 2),
                            data: null
                          })
                        });

                        return false;
                      }

                      fn({
                        appId: strapi.config.studio.appId,
                        token: strapi.token,
                        encrypted: strapi.rsa.encrypt({
                          err: null,
                          data: stringify(obj, null, 2)
                        })
                      });
                    });
                  } else if (!data.hasOwnProperty('action')) {
                    fn({
                      appId: strapi.config.studio.appId,
                      token: strapi.token,
                      encrypted: strapi.rsa.encrypt({
                        err: null,
                        data: stringify(true, null, 2)
                      })
                    });
                  } else {
                    fn({
                      appId: strapi.config.studio.appId,
                      token: strapi.token,
                      encrypted: strapi.rsa.encrypt({
                        err: stringify('Unknow action', null, 2),
                        data: null
                      })
                    });
                  }
                })
                .catch(function (err) {
                  fn({
                    appId: strapi.config.studio.appId,
                    token: strapi.token,
                    encrypted: strapi.rsa.encrypt({
                      err: err,
                      data: null
                    })
                  });
                });
            } else if (!data.hasOwnProperty('action')) {
              fn(strapi.rsa.encrypt(stringify('`action` attribute is missing', null, 2)), strapi.rsa.encryptPrivate(null));
            } else if (_.isFunction(_self[data.action])) {
              _self[data.action](data, function (err, obj) {
                if (err) {
                  fn({
                    appId: strapi.config.studio.appId,
                    token: strapi.token,
                    encrypted: strapi.rsa.encrypt({
                      err: err,
                      data: null
                    })
                  });

                  return false;
                }

                fn({
                  appId: strapi.config.studio.appId,
                  token: strapi.token,
                  encrypted: strapi.rsa.encrypt({
                    err: null,
                    data: stringify(obj, null, 2)
                  })
                });
              });
            } else {
              fn({
                appId: strapi.config.studio.appId,
                token: strapi.token,
                encrypted: strapi.rsa.encrypt({
                  err: stringify('Unknow action', null, 2),
                  data: null
                })
              });
            }
          } else {
            fn(stringify('Bad user token', null, 2), null);
          }
        });

        socket.on('err', function (data) {
          strapi.log.warn(data.text);
        });

        cb();
      } else {
        cb();
      }
    },

    connectWithStudio: function (socket) {
      strapi.rsa = new RSA({
        b: 2048
      });

      fs.readFile(path.resolve(process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'], '.strapirc'), {
        encoding: 'utf8'
      }, function (err, config) {
        if (err) {
          strapi.log.warn('Continuing without credentials.');
        } else {
          config = JSON.parse(config);
          strapi.token = config.token;

          socket.emit('getPublicKey', null, function (publicKey) {
            if (publicKey) {
              const key = new RSA();
              let object;
              key.importKey(publicKey, 'public');

              if (strapi.config.environment === 'development') {
                object = {
                  appId: strapi.config.studio.appId,
                  appName: strapi.config.name,
                  publicKey: strapi.rsa.exportKey('private'),
                  secretKey: strapi.config.studio.secretKey,
                  token: strapi.token,
                  env: strapi.config.environment
                };
              } else {
                object = {
                  appId: strapi.config.studio.appId,
                  appName: strapi.config.name,
                  publicKey: strapi.rsa.exportKey('private'),
                  secretKey: strapi.config.studio.secretKey,
                  env: strapi.config.environment
                };
              }

              socket.emit('check', key.encrypt(object));
            }
          });
        }
      });
    },

    /**
     * Subaction for config
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    handleConfig: function (data, cb) {
      strapi.log.warn('We need to flush server.');
      strapi.log.warn('Install dependencies if we have to.');

      cb(null, true);
    },

    /**
     * Pull global strapi variable from local server
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    pullServer: function (data, cb) {
      const obj = {};
      obj.token = strapi.token;
      obj.config = strapi.config;
      obj.models = strapi.models;
      obj.api = strapi.api;
      obj.templates = {};

      cb(null, obj);
    },

    /**
     * Pull global strapi variable from local server
     * in order to provide them to the dashboard
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    pullServerForDashboard: function (data, cb) {
      try {

        // Init ouptput object
        const obj = {};

        // Set the config.
        obj.settings = {
          url: strapi.config.url,
          i18n: strapi.config.i18n
        };

        // Set the models.
        obj.models = strapi.models;

        // Format `config.api` for multi templates models.
        _.forEach(strapi.api, function (api, key) {
          if (api.templates) {
            obj.models[key].templates = {};
          }

          // Assign the template attributes with the model attributes.
          _.forEach(api.templates, function (template, templateName) {
            obj.models[key].templates[templateName] = {};
            obj.models[key].templates[templateName].attributes = {};
            _.forEach(template.attributes, function (value, attributeKey) {
              obj.models[key].templates[templateName].attributes[attributeKey] = _.cloneDeep(obj.models[key].attributes[attributeKey]);
            });
            obj.models[key].templates[templateName].displayedAttribute = template.displayedAttribute;
          });
        });

        // User count.
        const promises = [];
        promises.push(strapi.orm.collections.user.count());

        Promise.all(promises)
          .then(function (response) {
            // Define if the app is considered as new.
            const userCount = response[0];
            obj.settings.isNewApp = !userCount;

            // Finally send the result in the callback.
            cb(null, obj);
          }, function (err) {
            cb(err);
          });
      } catch (err) {
        cb(err);
      }
    },

    /**
     * Rebuild dictionary
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    rebuild: function (data, cb) {
      strapi.rebuild();

      cb(null, true);
    },

    /**
     * Remove file or folder
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    removeFileOrFolder: function (data, cb) {
      const arrayOfPromises = [];

      if (data.hasOwnProperty('toRemove') && _.isArray(data.toRemove)) {
        const toRemove = function (path) {
          const deferred = Promise.defer();

          fs.exists(path, function (exists) {
            if (exists) {
              fs.remove(path, function (err) {
                if (err) {
                  deferred.reject(err);
                } else {
                  deferred.resolve();
                }
              });
            } else {
              deferred.reject('Unknow path `' + path + '`');
            }
          });

          return deferred.promise;
        };

        _.forEach(data.toRemove, function (fileOrFolder) {
          arrayOfPromises.push(toRemove(fileOrFolder.path));
        });

        Promise.all(arrayOfPromises)
          .then(function () {
            cb(null, true);
          })
          .catch(function (err) {
            cb(err, null);
          });
      } else {
        cb('Attribute `toRemove` is missing or is not an array', null);
      }
    },

    /**
     * Rename file or folder
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    renameFileOrFolder: function (data, cb) {
      const arrayOfPromises = [];

      if (data.hasOwnProperty('toRename') && _.isArray(data.toRename)) {
        const toRename = function (oldPath, newPath) {
          const deferred = Promise.defer();

          fs.exists(oldPath, function (exists) {
            if (exists) {
              fs.copy(oldPath, newPath, function (err) {
                if (err) {
                  deferred.reject(err);
                } else {
                  fs.remove(oldPath, function (err) {
                    if (err) {
                      deferred.reject(err);
                    }

                    deferred.resolve();
                  });
                }
              });
            } else {
              deferred.reject('Unknow path `' + path + '`');
            }
          });

          return deferred.promise;
        };

        _.forEach(data.toRename, function (fileOrFolder) {
          arrayOfPromises.push(toRename(fileOrFolder.oldPath, fileOrFolder.newPath));
        });

        Promise.all(arrayOfPromises)
          .then(function () {
            cb(null, true);
          })
          .catch(function (err) {
            cb(err, null);
          });
      } else {
        cb('Attribute `toRename` is missing or is not an array', null);
      }
    },

    /**
     * Function to unzip file or folder to specific folder
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */
    unzipper: function (data) {
      const deferred = Promise.defer();

      crypto.pbkdf2(data.token, strapi.token, 4096, 32, 'sha256', function (err, derivedKey) {
        if (err) {
          deferred.reject(err);
        }

        const fileToUnzip = path.resolve(strapi.config.appPath, '.tmp', derivedKey.toString('hex') + '.zip');

        request({
          method: 'POST',
          preambleCRLF: true,
          postambleCRLF: true,
          json: true,
          uri: strapi.config.studio.url + '/socket/download',
          encoding: null,
          body: {
            token: strapi.token,
            fileId: data.token,
            src: data.src
          }
        })
        .pipe(fs.createWriteStream(fileToUnzip))
        .on('close', function () {

          let folderDest;
          const folderOrFiletoRemove = path.resolve(data.dest);

          if (data.src === 'api') {
            folderDest = folderOrFiletoRemove;
          } else {
            folderDest = path.resolve(data.dest, '..');
          }

          fs.remove(folderOrFiletoRemove, function (err) {
            if (err) {
              deferred.reject(err);
            }

            _.defer(function () {
              fs.createReadStream(fileToUnzip).pipe(unzip.Extract({
                path: folderDest
              }))
                .on('close', function () {
                  fs.remove(fileToUnzip, function (err) {
                    if (err) {
                      deferred.reject(err);
                    }

                    deferred.resolve();
                  });
                }).on('error', function (err) {
                  deferred.reject(err);
                });
            });
          });
        })
        .on('error', function () {
          deferred.reject('Download ZIP or unzip not worked fine', null);
        });
      });

      return deferred.promise;
    }
  };

  return hook;
};
