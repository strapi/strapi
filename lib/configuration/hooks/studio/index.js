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

      if (_.isPlainObject(strapi.config.studio) && !_.isEmpty(strapi.config.studio) && strapi.config.studio.enabled === true && strapi.config.environment === 'development') {
        const manager = io.Manager('http://studio.strapi.io', {
          reconnectionDelay: 2000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        const socket = io.connect('http://studio.strapi.io', {
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

        // Launch studio connection after received
        // bootstrap and socket connect events
        const done = _.after(2, function () {
          _self.connectWithStudio(socket);
        });

        // After bootstrap
        strapi.once('bootstrap:done', function () {
          done();
        });

        manager.on('connect_failed', function () {
          strapi.log.warn('Connection to the Studio server failed!');
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
          done();
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
              strapi.log.warn('The use of the Studio is restricted to development environment.');
            }
          }
        });

        socket.on('todo', function (data, fn) {
          if (!data.hasOwnProperty('from') || !data.hasOwnProperty('to')) {
            fn(stringify('Some required attributes are missing', null, 2), null);
          } else if (data.from === strapi.token) {
            if (data.hasOwnProperty('files')) {
              const syncPromise = function (file, index) {
                return new Promise(function (resolve, reject) {
                  _self.unzipper(file)
                    .then(function () {
                      if (!_.isEmpty(data.files[index + 1])) {
                        return syncPromise(data.files[index + 1], index + 1);
                      } else {
                        resolve();
                      }
                    })
                    .then(function () {
                      resolve();
                    })
                    .catch(function (err) {
                      reject(err);
                    });
                });
              };

              if (_.isEmpty(data.files)) {
                fn({
                  appId: strapi.config.studio.appId,
                  token: strapi.token,
                  encrypted: strapi.rsa.encrypt({
                    err: null,
                    data: stringify({}, null, 2)
                  })
                });
              } else {
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
                          err: stringify('Unknown action', null, 2),
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
              }
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
                  err: stringify('Unknown action', null, 2),
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
      strapi.log.info('Connection with the Studio server found, please wait a few seconds...');

      // Purge
      delete strapi.rsa;

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
            if (publicKey && strapi.config.environment === 'development') {
              const key = new RSA();
              key.importKey(publicKey, 'public');

              const object = {
                appId: strapi.config.studio.appId,
                appName: strapi.config.name,
                publicKey: strapi.rsa.exportKey('private'),
                secretKey: strapi.config.studio.secretKey,
                token: strapi.token,
                env: strapi.config.environment
              };

              socket.emit('check', key.encrypt(object));
            }
          });
        }
      });
    },

    /**
     * Pull global strapi variable from local server
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    pullServer: function (data, cb) {
      const obj = {
        token: strapi.token,
        config: strapi.config,
        models: _.mapValues(_.cloneDeep(strapi.models), function (model) {
          model.attributes = _.omit(model.attributes, _.isFunction);

          return model;
        }),
        api: _.mapValues(_.cloneDeep(strapi.api), function (api) {
          _.forEach(api.models, function (model) {
            model.attributes = _.omit(model.attributes, _.isFunction);
          });

          return api;
        }),
        templates: {}
      };

      cb(null, obj);
    },

    /**
     * Pull file from local server
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    pullFile: function (data, cb) {
      const rootPath = path.normalize(data.path);

      fs.exists(rootPath, function (exists) {
        if (exists) {
          fs.readFile(rootPath, 'utf8', function (err, file) {
            if (err) {
              cb('Impossible to read `' + rootPath + '`', null);
            } else {
              cb(null, {
                path: data.path,
                value: JSON.parse(file)
              });
            }
          });
        } else {
          cb('Unknown path `' + rootPath + '`', null);
        }
      });
    },

    /**
     * Rebuild dictionary
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */

    rebuild: function (data, cb) {
      process.nextTick(function () {
        strapi.restart(function () {
          cb(null, true);
        });
      });
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
          return new Promise(function (resolve, reject) {
            fs.exists(path, function (exists) {
              if (exists) {
                fs.remove(path, function (err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              } else {
                reject('Unknown path `' + path + '`');
              }
            });
          });
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
     * Function to unzip file or folder to specific folder
     *
     * @param {Object} data
     *
     * @return {Function} cb
     */
    unzipper: function (data) {
      return new Promise(function (resolve, reject) {
        crypto.pbkdf2(data.token, strapi.token, 4096, 32, 'sha256', function (err, derivedKey) {
          if (err) {
            reject(err);
          }

          // Force posix to be fully compatible with the Studio server
          const fileToUnzip = path.posix.normalize(path.join(strapi.config.appPath, '.tmp', derivedKey.toString('hex') + '.zip'));

          request({
            method: 'POST',
            preambleCRLF: true,
            postambleCRLF: true,
            json: true,
            uri: 'http://studio.strapi.io/socket/download',
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
              const folderOrFiletoRemove = path.normalize(data.dest);

              if (data.src === 'api') {
                folderDest = folderOrFiletoRemove;
              } else {
                folderDest = path.join(data.dest, '..');
              }

              fs.remove(folderOrFiletoRemove, function (err) {
                if (err) {
                  reject(err);
                }

                _.defer(function () {
                  fs.createReadStream(fileToUnzip).pipe(unzip.Extract({
                    path: folderDest
                  }))
                    .on('close', function () {
                      fs.remove(fileToUnzip, function (err) {
                        if (err) {
                          reject(err);
                        }

                        resolve();
                      });
                    }).on('error', function (err) {
                      reject(err);
                    });
                });
              });
            })
            .on('error', function () {
              reject('Download ZIP or unzip not worked fine', null);
            });
        });
      });
    }
  };

  return hook;
};
