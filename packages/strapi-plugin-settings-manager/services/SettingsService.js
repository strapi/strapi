'use strict';

/**
 * Module dependencies
 */

// Node.js core
const path = require('path');

// Public node modules
const _ = require('lodash');
const fs = require('fs-extra');

/**
 * Run resolver function
 *
 * @param {Function} fn
 * @param {String|Object|Array|Integer} rootValue
 * @param {String} attribute
 * @param {Object} scope
 * @param {String} parent
 *
 * @return {Promise*Object}
 */
exports.resolver = (fn, rootValue, attribute, scope, rootAttribute) => {
  return new Promise((resolve, reject) => {
    let value;

    if (_.isEmpty(rootAttribute)) {
      value = rootValue[attribute];
    } else {
      value = rootValue[rootAttribute][attribute];
    }

    /**
     * @param {Object} rootValue: Object send by the server
     * @param {Object|String|Integer|Null} value: Value of this attribute
     * @param {Object} scope: Value of file
     * @param {Function} cb
     */
    fn(rootValue, value, scope, (err, value) => {
      if (err) {
        let rejection = {};

        if (_.isEmpty(rootAttribute)) {
          rejection = attribute;
        } else {
          rejection = rootAttribute + ' > ' + attribute;
        }

        reject({
          error: 'Resolver rejection',
          attribute: rejection,
          msg: err
        });
      } else {
        let response = {};

        if (_.isEmpty(rootAttribute)) {
          response = {
            value: value,
            attribute: attribute
          };
        } else {
          response[rootAttribute] = {
            value: value,
            attribute: attribute
          };
        }

        resolve(response);
      }
    });
  });
};

/**
 * Get data type
 *
 * @param {String|Object|Array|Integer} value
 *
 * @return {String}
 */
exports.getType = value => {
  if (_.isArray(value)) {
    return 'array';
  } else if (value === parseInt(value, 10)) {
    return 'integer';
  } else if (_.isObject(value)) {
    return 'object';
  } else if (_.isBoolean(value)) {
    return 'boolean';
  } else if (_.isNull(value)) {
    return 'null';
  } else if (_.isString(value)) {
    return 'string';
  }

  return 'Unknown type';
};

/**
 * Check data type
 *
 * @param {String} type
 * @param {String} key
 * @param {String|Object|Array|Integer} key
 *
 * @return {Promise*Object}
 */
exports.isType = (type, key, value) => {
  return new Promise((resolve, reject) => {
    switch (type) {
      case 'boolean':
        if (!_.isBoolean(value)) {
          reject({
            excepted: 'boolean',
            attribute: key,
            error: key + ' is not a boolean'
          });
        }

        break;
      case 'null':
        if (!_.isNull(value)) {
          reject({
            excepted: 'null',
            attribute: key,
            error: key + ' is not a null'
          });
        }

        break;
      case 'integer':
        if (value !== parseInt(value, 10)) {
          reject({
            excepted: 'integer',
            attribute: key,
            error: key + ' is not an integer'
          });
        }

        break;
      case 'object':
        if (!_.isObject(value)) {
          reject({
            excepted: 'object',
            attribute: key,
            error: key + ' is not an object'
          });
        }

        break;
      case 'array':
        if (!_.isArray(value)) {
          reject({
            excepted: 'array',
            attribute: key,
            error: key + ' is not an array'
          });
        }

        break;
      case 'string':
        if (!_.isString(value)) {
          reject({
            excepted: 'string',
            attribute: key,
            error: key + ' is not a string'
          });
        }

        break;
      default:
        reject({
          excepted: 'Unknown type',
          attribute: key,
          error: key + ' type is not in the schema'
        });

        break;
    }

    resolve(type);
  });
};

/**
 * Parse value to verify data type and resolve path
 *
 * @param {Object} app
 * @param {Object} validations
 * @param {Object} attribute
 * @param {Object} value
 * @param {Object} rootAttribute
 *
 * @return {Promise*Object}
 */
exports.parser = (app, validations, attribute, value, rootAttribute) => {
  return new Promise((resolve, reject) => {
    const rootPath = validations.hasOwnProperty('path') && _.isString(validations.path) ? validations.path : null;
    const rootType = validations.hasOwnProperty('type') ? validations.type : reject('Schema parameters `type` is missing.');
    const rootNested = validations.hasOwnProperty('nested') && _.isString(validations.nested) ? validations.nested : null;
    const rootKey = validations.hasOwnProperty('key') && _.isString(validations.key) ? validations.key : null;

    if (_.isArray(rootType)) {
      let typeFounded = null;
      const arrayOfErrors = [];

      const done = _.after(_.size(rootType), function () {
        if (_.isEmpty(typeFounded)) {
          reject(arrayOfErrors);
        } else {
          const object = {};

          if (!_.isEmpty(rootAttribute)) {
            object[rootAttribute] = {};
            object[rootAttribute][attribute] = {
              type: typeFounded
            };
          } else {
            object[attribute] = {
              type: typeFounded,
              path: _.isNull(rootPath) ? rootPath : path.join(app.config.appPath, rootPath)
            };

            // Keep nested value
            if (!_.isNull(rootNested)) {
              object[attribute].nested = rootNested;
            }

            // Keep key to write
            if (!_.isNull(rootKey)) {
              object[attribute].key = rootKey;
            }
          }

          resolve(object);
        }
      });

      _.forEach(rootType, type => {
        exports.isType(type, attribute, value)
          .then(type => {
            typeFounded = type;

            done();
          })
          .catch(error => {
            arrayOfErrors.push(error);

            done();
          });
      });
    } else {
      exports.isType(rootType, attribute, value)
        .then(type => {
          const object = {};

          if (!_.isEmpty(rootAttribute)) {
            object[rootAttribute] = {};
            object[rootAttribute][attribute] = {
              type: type
            };
          } else {
            object[attribute] = {
              type: type,
              path: _.isNull(rootPath) ? rootPath : path.join(app.config.appPath, rootPath)
            };

            // Keep nested value
            if (!_.isNull(rootNested)) {
              object[attribute].nested = rootNested;
            }

            // Keep key to write
            if (!_.isNull(rootKey)) {
              object[attribute].key = rootKey;
            }
          }

          resolve(object);
        })
        .catch(error => {
          reject(error);
        });
    }
  });
};

/**
 * Parse schema, validate it, run tests and resolvers
 *
 * @param {Object} app
 * @param {Object} schema
 * @param {Object} params
 *
 * @return {Promise*Array}
 */
exports.parse = (app, schema, params) => {
  return new Promise((resolve, reject) => {
    const diff = _.difference(_.keys(schema), _.keys(params));

    if (_.isEmpty(diff)) {
      const arrayOfTypes = [];
      let AST = {};

      _.forEach(schema, (validations, attribute) => {
        arrayOfTypes.push(exports.parser(app, validations, attribute, params[attribute]));
      });

      // Check value's type
      Promise.all(arrayOfTypes)
        .then(results => {
          // Build AST
          _.forEach(results, value => {
            AST = _.merge(AST, value);
          });

          const arrayOfNestedType = [];

          _.forEach(schema, (validations, attribute) => {
            if (_.isArray(validations.type)) {
              const type = AST[attribute].type;

              if (type === 'object') {
                _.forEach(validations.values[type], (validations, key) => {
                  arrayOfNestedType.push(exports.parser(app, validations, key, params[attribute][key], attribute));
                });
              }
            }
          });

          // Check value's type for nested objects
          return Promise.all(arrayOfNestedType);
        })
        .then(results => {
          // Build AST
          _.forEach(AST, (validation, attribute) => {
            if (validation.type === 'object') {
              AST[attribute].value = {};

              _.forEach(results, (value) => {
                if (value.hasOwnProperty(attribute)) {
                  AST[attribute].schema = value[attribute];
                }
              });
            }
          });

          // Get values
          return exports.getFiles(app, AST);
        })
        .then(files => {
          const arrayOfResolvers = [];

          _.forEach(AST, (rootValidations, rootAttribute) => {
            if (rootValidations.type === 'object') {
              _.forEach(rootValidations.schema, (validations, attribute) => {
                if (schema[rootAttribute].values.object[attribute].hasOwnProperty('resolver') && _.isFunction(schema[rootAttribute].values.object[attribute].resolver)) {
                  const index = _.findIndex(files, (n) => {
                    return n.path === rootValidations.path;
                  });

                  const resolver = schema[rootAttribute].values.object[attribute].resolver;

                  // Run resolver
                  arrayOfResolvers.push(exports.resolver(resolver, params, attribute, (index >= 0) ? files[index].value : params, rootAttribute));
                } else {
                  AST[rootAttribute].value[attribute] = params[rootAttribute][attribute];
                }
              });
            }

            if (schema[rootAttribute].hasOwnProperty('resolver') && _.isFunction(schema[rootAttribute].resolver)) {
              const index = _.findIndex(files, n => {
                return n.path === rootValidations.path;
              });

              const resolver = schema[rootAttribute].resolver;

              // Run resolver
              arrayOfResolvers.push(exports.resolver(resolver, params, rootAttribute, (index >= 0) ? files[index].value : params));
            } else {
              AST[rootAttribute].value = params[rootAttribute];
            }
          });

          // Execute resolver function for each value
          return Promise.all(arrayOfResolvers);
        })
        .then(results => {
          // Detect errors
          return Promise.all(results);
        })
        .then(arrayOfValues => {
          _.forEach(arrayOfValues, (data) => {
            AST[data.attribute].value = data.value;
          });

          resolve(AST);
        })
        .catch(errors => {
          console.log('errors', errors);
          reject(errors);
        });
    } else {
      reject('Some attributes are missing (' + diff.toString() + ')');
    }
  });
};

/**
 * Get configuration files values
 *
 * @param {Object} app
 * @param {Object} AST
 *
 * @return {Promise*Array}
 */
exports.getFiles = (app, AST) => {
  const arrayOfPromises = [];
  const filesToPull = _.groupBy(AST, 'path');

  // Remove null path
  delete filesToPull.null;

  _.forEach(filesToPull, (attributes, path) => {
    arrayOfPromises.push(new Promise((resolve, reject) => {
      const rootPath = path;
      // TODO: normalize
      // const rootPath = path.normalize(path);

      fs.exists(rootPath, exists => {
        if (exists) {
          fs.readFile(rootPath, 'utf8', (err, file) => {
            if (err) {
              reject('Impossible to read `' + rootPath + '`', null);
            } else {
              resolve({
                path: path,
                value: JSON.parse(file)
              });
            }
          });
        } else {
          reject('Unknown path `' + rootPath + '`', null);
        }
      });
    }));
  });

  return Promise.all(arrayOfPromises);
};

/**
 * Update configuration files values
 *
 * @param {Object} app
 * @param {Object} schema
 * @param {Object} AST
 *
 * @return {Promise*Array}
 */
exports.updateFiles = (app, schema, AST) => {
  return new Promise(resolve => {
    let arrayOfFiles = [];

    exports.getFiles(app, AST)
      .then(files => {
        if (_.isEmpty(files)) {
          return Promise.resolve(files);
        }

        // Update values
        _.forEach(AST, (validations, attribute) => {
          if (!schema[attribute].hasOwnProperty('update') || (schema[attribute].hasOwnProperty('update') && schema[attribute].update !== false)) {
            const index = _.findIndex(files, (n) => {
              return n.path === validations.path;
            });

            if (index >= 0) {
              let rootAttribute = null;
              let subAttribute = null;
              const type = exports.getType(files[index].value[attribute]);

              if (_.isEmpty(validations.nested) && _.isEmpty(validations.key)) {
                rootAttribute = attribute;
              } else if (_.isEmpty(validations.nested) && !_.isEmpty(validations.key)) {
                rootAttribute = validations.key;
              } else if (!_.isEmpty(validations.nested) && !_.isEmpty(validations.key)) {
                rootAttribute = validations.nested;
                subAttribute = validations.key;
              } else {
                rootAttribute = validations.nested;
                subAttribute = attribute;
              }

              // Merge values only if the current type and destination object are object or array.
              if (_.includes(['array', 'object'], type) && _.includes(['array', 'object'], validations.type) && _.isNull(subAttribute)) {
                files[index].value[rootAttribute] = _.assign(files[index].value[attribute], validations.value);
              } else if (_.includes(['array', 'object'], type) && _.includes(['array', 'object'], validations.type) && !_.isNull(subAttribute)) {
                files[index].value[rootAttribute][subAttribute] = _.assign(files[index].value[attribute], validations.value);
              } else if (_.isNull(subAttribute)) {
                files[index].value[rootAttribute] = validations.value;
              } else {
                files[index].value[rootAttribute][subAttribute] = validations.value;
              }
            }
          }
        });

        const arrayOfPromises = [];

        // Generate new files
        _.forEach(files, data => {
          arrayOfPromises.push(exports.generateSetting(app, data.path, path.basename(data.path), data.value));
        });

        return Promise.all(arrayOfPromises);
      })
      .then(files => {
        arrayOfFiles = _.union(arrayOfFiles, files);
        resolve(arrayOfFiles);
      })
      .catch(error => {
        resolve(error);
      });
  });
};

/**
 * Generate settings file
 *
 * @param {Object} app
 * @param {String} rootPath
 * @param {String} file
 * @param {Object} rootValue
 *
 * @return {Promise}
 */
exports.generateSetting = (app, rootPath, file, rootValue) => {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(strapi.config.appPath, file);

    fs.writeJSON(filePath, rootValue, err => {
      if (err) {
        reject(err);
      }

      resolve({
        dest: path.join(rootPath),
        src: 'config'
      });
    });
  });
};

/**
 * Update general settings
 *
 * @param {Object} app
 * @param {Object} params
 *
 * @return {Promise*Array}
 */
exports.configurationsManager = (app, params) => {
  return new Promise((resolve, reject) => {
    const rootPath = path.resolve(__dirname, 'settings', 'Schema' + _.capitalize(params.type) + '.js');
    fs.exists(rootPath, exists => {
      if (exists) {
        if (params.hasOwnProperty('environment') && _.includes(_.keys(app.config.environments), params.environment)) {
          app.currentUpdatedEnvironment = params.environment;
        } else if (params.hasOwnProperty('environment') && !_.includes(_.keys(app.config.environments), params.environment)) {
          reject('Unknown environment');
          return;
        }

        const schema = require('./settings/Schema' + _.capitalize(params.type) + '.js')();
        let globalValues = null;

        exports.parse(app, schema, params.values)
          .then(AST => {
            globalValues = _.mapValues(AST, 'value');
            return exports.updateFiles(app, schema, AST);
          })
          .then(files => {
            resolve({
              values: globalValues,
              files: files
            });
          })
          .catch(errors => {
            console.log('errors', errors);
            reject(errors);
          });
      } else {
        reject('Unknown settings schema');
      }
    });
  });
};
