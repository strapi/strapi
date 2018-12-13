'use strict';

/**
 * Documentation.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const pathToRegexp = require('path-to-regexp');
const settings = require('../config/settings.json');
const defaultComponents = require('./utils/components.json');
const form = require('./utils/forms.json');
const parametersOptions = require('./utils/parametersOptions.json');

module.exports = {
  areObjectsEquals: (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  },

  checkIfAPIDocNeedsUpdate: function(apiName) {
    const prevDocumentation = this.createDocObject(this.retrieveDocumentation(apiName));
    const currentDocumentation = this.createDocObject(this.createDocumentationFile(apiName, false));

    return !this.areObjectsEquals(prevDocumentation, currentDocumentation);
  },

  /**
   * Check if the documentation folder with its related version of an API exists
   * @param {String} apiName
   */
  checkIfDocumentationFolderExists: function(apiName) {
    try {
      fs.accessSync(this.getDocumentationPath(apiName));
      return true;
    } catch (err) {
      return false;
    }
  },

  checkIfPluginDocumentationFolderExists: function(pluginName) {
    try {
      fs.accessSync(this.getPluginDocumentationPath(pluginName));
      return true;
    } catch (err) {
      return false;
    }
  },

  checkIfPluginDocNeedsUpdate: function(pluginName) {
    const prevDocumentation = this.createDocObject(this.retrieveDocumentation(pluginName, true));
    const currentDocumentation = this.createDocObject(
      this.createPluginDocumentationFile(pluginName, false),
    );

    return !this.areObjectsEquals(prevDocumentation, currentDocumentation);
  },

  checkIfApiDefaultDocumentationFileExist: function(apiName, docName) {
    try {
      fs.accessSync(this.getAPIOverrideDocumentationPath(apiName, docName));
      return true;
    } catch (err) {
      return false;
    }
  },

  checkIfPluginDefaultDocumentFileExists: function(pluginName, docName) {
    try {
      fs.accessSync(this.getPluginOverrideDocumentationPath(pluginName, docName));
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Check if the documentation folder exists in the documentation plugin
   * @returns {Boolean}
   */
  checkIfMergedDocumentationFolderExists: function() {
    try {
      fs.accessSync(this.getMergedDocumentationPath());
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Recursively create missing directories
   * @param {String} targetDir
   *
   */
  createDocumentationDirectory: function(targetDir) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = '.';

    return targetDir.split(sep).reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);

      try {
        fs.mkdirSync(curDir);
      } catch (err) {
        if (err.code === 'EEXIST') {
          // curDir already exists!
          return curDir;
        }

        // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
        if (err.code === 'ENOENT') {
          // Throw the original parentDir error on curDir `ENOENT` failure.
          throw new Error(
            `Impossible to create the documentation folder in '${parentDir}', please check the permissions.`,
          );
        }

        const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;

        if (!caughtErr || (caughtErr && targetDir === curDir)) {
          throw err; // Throw if it's just the last created dir.
        }
      }

      return curDir;
    }, initDir);
  },

  /**
   * Create the apiName.json and unclassified.json files inside an api's documentation/version folder
   * @param {String} apiName
   */
  createDocumentationFile: function(apiName, writeFile = true) {
    // Retrieve all the routes from an API
    const apiRoutes = this.getApiRoutes(apiName);
    const apiDocumentation = this.generateApiDocumentation(apiName, apiRoutes);

    return Object.keys(apiDocumentation).reduce((acc, docName) => {
      const targetFile = path.resolve(this.getDocumentationPath(apiName), `${docName}.json`);
      // Create the components object in each documentation file when we can create it
      const components =
        strapi.models[docName] !== undefined ? this.generateResponseComponent(docName) : {};
      const tags = docName.split('-').length > 1 ? [] : this.generateTags(apiName, docName);
      const documentation = Object.assign(apiDocumentation[docName], components, { tags });

      try {
        if (writeFile) {
          return fs.writeFileSync(targetFile, JSON.stringify(documentation, null, 2), 'utf8');
        } else {
          return acc.concat(documentation);
        }
      } catch (err) {
        return acc;
      }
    }, []);
  },

  createPluginDocumentationFile: function(pluginName, writeFile = true) {
    const pluginRoutes = this.getPluginRoutesWithDescription(pluginName);
    const pluginDocumentation = this.generatePluginDocumentation(pluginName, pluginRoutes);

    return Object.keys(pluginDocumentation).reduce((acc, docName) => {
      const targetFile = path.resolve(
        this.getPluginDocumentationPath(pluginName),
        `${docName}.json`,
      );
      const components =
        _.get(strapi, this.getModelForPlugin(docName, pluginName)) !== undefined &&
        pluginName !== 'upload'
          ? this.generateResponseComponent(docName, pluginName, true)
          : {};
      const [plugin, name] = this.getModelAndNameForPlugin(docName, pluginName);
      const tags =
        docName !== 'unclassified'
          ? this.generateTags(plugin, docName, _.upperFirst(this.formatTag(plugin, name)), true)
          : [];
      const documentation = Object.assign(pluginDocumentation[docName], components, { tags });

      try {
        if (writeFile) {
          return fs.writeFileSync(targetFile, JSON.stringify(documentation, null, 2), 'utf8');
        } else {
          return acc.concat(documentation);
        }
      } catch (err) {
        // Silent
      }
    }, []);
  },

  createDocObject: array => {
    return array.reduce((acc, curr) => _.merge(acc, curr), {});
  },

  deleteDocumentation: async function(version = this.getDocumentationVersion()) {
    const recursiveDeleteFiles = async (folderPath, removeCompleteFolder = true) => {
      // Check if folderExist
      try {
        const arrayOfPromises = [];
        fs.accessSync(folderPath);
        const items = fs.readdirSync(folderPath).filter(x => x[0] !== '.');

        items.forEach(item => {
          const itemPath = path.join(folderPath, item);

          // Check if directory
          if (fs.lstatSync(itemPath).isDirectory()) {
            if (removeCompleteFolder) {
              return arrayOfPromises.push(recursiveDeleteFiles(itemPath), removeCompleteFolder);
            } else if (!itemPath.includes('overrides')) {
              return arrayOfPromises.push(recursiveDeleteFiles(itemPath), removeCompleteFolder);
            }
          } else {
            // Delete all files
            try {
              fs.unlinkSync(itemPath);
            } catch (err) {
              console.log('Cannot delete file', err);
            }
          }
        });

        await Promise.all(arrayOfPromises);

        try {
          if (removeCompleteFolder) {
            fs.rmdirSync(folderPath);
          }
        } catch (err) {
          // console.log(err);
        }
      } catch (err) {
        // console.log('The folder does not exist');
      }
    };

    const arrayOfPromises = [];

    // Delete api's documentation
    const apis = this.getApis();
    const plugins = this.getPluginsWithDocumentationNeeded();

    apis.forEach(api => {
      const apiPath = path.join(strapi.config.appPath, 'api', api, 'documentation', version);
      arrayOfPromises.push(recursiveDeleteFiles(apiPath));
    });

    plugins.forEach(plugin => {
      const pluginPath = path.join(
        strapi.config.appPath,
        'plugins',
        plugin,
        'documentation',
        version,
      );

      if (version !== '1.0.0') {
        arrayOfPromises.push(recursiveDeleteFiles(pluginPath));
      } else {
        arrayOfPromises.push(recursiveDeleteFiles(pluginPath, false));
      }
    });

    const fullDocPath = path.join(
      strapi.config.appPath,
      'plugins',
      'documentation',
      'documentation',
      version,
    );
    arrayOfPromises.push(recursiveDeleteFiles(fullDocPath));

    return await Promise.all(arrayOfPromises);
  },

  /**
   *
   * Wrap endpoints variables in curly braces
   * @param {String} endPoint
   * @returns {String} (/products/{id})
   */
  formatApiEndPoint: endPoint => {
    return pathToRegexp
      .parse(endPoint)
      .map(token => {
        if (_.isObject(token)) {
          return token.prefix + '{' + token.name + '}'; // eslint-disable-line prefer-template
        }

        return token;
      })
      .join('');
  },

  /**
   * Format a plugin model for example users-permissions, user => Users-Permissions - User
   * @param {Sting} plugin
   * @param {String} name
   * @param {Boolean} withoutSpace
   * @return {String}
   */
  formatTag: (plugin, name, withoutSpace = false) => {
    const formattedPluginName = plugin
      .split('-')
      .map(i => _.upperFirst(i))
      .join('-');
    const formattedName = _.upperFirst(name);

    if (withoutSpace) {
      return `${formattedPluginName}${formattedName}`;
    }

    return `${formattedPluginName} - ${formattedName}`;
  },

  generateAssociationSchema: function(attributes, getter) {
    return Object.keys(attributes).reduce(
      (acc, curr) => {
        const attribute = attributes[curr];
        const isField =
          !attribute.hasOwnProperty('model') && !attribute.hasOwnProperty('collection');

        if (attribute.required) {
          acc.required.push(curr);
        }

        if (isField) {
          acc.properties[curr] = { type: this.getType(attribute.type) };
        } else {
          const newGetter = getter.slice();
          newGetter.splice(newGetter.length - 1, 1, 'associations');
          const relationNature = _.get(strapi, newGetter).filter(
            association => association.alias === curr,
          )[0].nature;

          switch (relationNature) {
            case 'manyToMany':
            case 'oneToMany':
            case 'manyToManyMorph':
              acc.properties[curr] = { type: 'array', items: { type: 'string' } };
              break;
            default:
              acc.properties[curr] = { type: 'string' };
          }
        }

        return acc;
      },
      { required: ['id'], properties: { id: { type: 'string' } } },
    );
  },

  /**
   * Creates the paths object with all the needed informations
   * The object has the following structure { apiName: { paths: {} }, knownTag1: { paths: {} }, unclassified: { paths: {} } }
   * Each key will create a documentation.json file
   *
   * @param {String} apiName
   * @param {Array} routes
   * @returns {Object}
   */
  generateApiDocumentation: function(apiName, routes) {
    return routes.reduce((acc, current) => {
      const [controllerName, controllerMethod] = current.handler.split('.');
      // Retrieve the tag key in the config object
      const routeTagConfig = _.get(current, ['config', 'tag']);
      // Add curly braces between dynamic params
      const endPoint = this.formatApiEndPoint(current.path);
      const verb = current.method.toLowerCase();
      // The key corresponds to firsts keys of the returned object
      let key;
      let tags;

      if (controllerName.toLowerCase() === apiName && !_.isObject(routeTagConfig)) {
        key = apiName;
      } else if (routeTagConfig !== undefined) {
        if (_.isObject(routeTagConfig)) {
          const { name, plugin } = routeTagConfig;
          const referencePlugin = !_.isEmpty(plugin);

          key = referencePlugin ? `${plugin}-${name}` : name.toLowerCase();
          tags = referencePlugin ? this.formatTag(plugin, name) : _.upperFirst(name);
        } else {
          key = routeTagConfig.toLowerCase();
        }
      } else {
        key = 'unclassified';
      }

      const verbObject = {
        deprecated: false,
        description: this.generateVerbDescription(
          verb,
          current.handler,
          key,
          endPoint.split('/')[1],
          current.config.description,
        ),
        responses: this.generateResponses(verb, current, key),
        summary: '',
        tags: _.isEmpty(tags) ? [_.upperFirst(key)] : [_.upperFirst(tags)],
      };

      _.set(acc, [key, 'paths', endPoint, verb], verbObject);

      if (verb === 'post' || verb === 'put') {
        let requestBody;

        if (controllerMethod === 'create' || controllerMethod === 'update') {
          requestBody = {
            description: '',
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/New${_.upperFirst(key)}`,
                },
              },
            },
          };
        } else {
          requestBody = {
            description: '',
            required: true,
            content: {
              'application/json': {
                schema: {
                  properties: {
                    foo: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          };
        }

        _.set(acc, [key, 'paths', endPoint, verb, 'requestBody'], requestBody);
      }

      // Refer to https://swagger.io/specification/#pathItemObject
      const parameters = this.generateVerbParameters(verb, controllerMethod, current.path);

      if (verb !== 'post') {
        _.set(acc, [key, 'paths', endPoint, verb, 'parameters'], parameters);
      }

      return acc;
    }, {});
  },

  generateFullDoc: function(version = this.getDocumentationVersion()) {
    const apisDoc = this.retrieveDocumentationFiles(false, version);
    const pluginsDoc = this.retrieveDocumentationFiles(true, version);
    const appDoc = [...apisDoc, ...pluginsDoc];
    const defaultSettings = _.cloneDeep(settings);
    _.set(defaultSettings, ['info', 'x-generation-date'], moment().format('L LTS'));
    _.set(defaultSettings, ['info', 'version'], version);
    const tags = appDoc.reduce((acc, current) => {
      const tags = current.tags.filter(el => {
        return _.findIndex(acc, ['name', el.name || '']) === -1;
      });

      return acc.concat(tags);
    }, []);
    const fullDoc = _.merge(
      appDoc.reduce((acc, current) => {
        return _.merge(acc, current);
      }, defaultSettings),
      defaultComponents,
      // { tags },
    );

    fullDoc.tags = tags;

    return fullDoc;
  },
  /**
   * Generate the main component that has refs to sub components
   * @param {Object} attributes
   * @param {Array} associations
   * @returns {Object}
   */
  generateMainComponent: function(attributes, associations) {
    return Object.keys(attributes).reduce(
      (acc, current) => {
        const attribute = attributes[current];
        // Refer to https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#dataTypes
        const type = this.getType(attribute.type);
        const {
          description,
          default: defaultValue,
          minimum,
          maxmimun,
          maxLength,
          minLength,
          enum: enumeration,
        } = attribute;

        if (attribute.required === true) {
          acc.required.push(current);
        }

        if (attribute.model || attribute.collection) {
          const currentAssociation = associations.filter(
            association => association.alias === current,
          )[0];
          const relationNature = currentAssociation.nature;
          const name = currentAssociation.model || currentAssociation.collection;
          const getter =
            currentAssociation.plugin !== undefined
              ? ['plugins', currentAssociation.plugin, 'models', name, 'attributes']
              : ['models', name, 'attributes'];
          const associationAttributes = _.get(strapi, getter);
          const associationSchema = this.generateAssociationSchema(associationAttributes, getter);

          switch (relationNature) {
            case 'manyToMany':
            case 'oneToMany':
            case 'manyToManyMorph':
              acc.properties[current] = { type: 'array', items: associationSchema };
              break;
            default:
              acc.properties[current] = associationSchema;
          }
        } else {
          acc.properties[current] = {
            type,
            description,
            default: defaultValue,
            minimum,
            maxmimun,
            maxLength,
            minLength,
            enum: enumeration,
          };
        }

        return acc;
      },
      { required: ['id'], properties: { id: { type: 'string' } } },
    );
  },

  generatePluginDocumentation: function(pluginName, routes) {
    return routes.reduce((acc, current) => {
      const {
        config: { description, prefix },
      } = current;
      const endPoint =
        prefix === undefined
          ? this.formatApiEndPoint(`/${pluginName}${current.path}`)
          : this.formatApiEndPoint(`${prefix}${current.path}`);
      const verb = current.method.toLowerCase();
      const actionType = _.get(current, ['config', 'tag', 'actionType'], '');
      let key;
      let tags;

      if (_.isObject(current.config.tag)) {
        const { name, plugin } = current.config.tag;
        key = plugin ? `${plugin}-${name}` : name;
        tags = plugin ? [this.formatTag(plugin, name)] : [name];
      } else {
        const tag = current.config.tag;
        key = !_.isEmpty(tag) ? tag : 'unclassified';
        tags = !_.isEmpty(tag) ? [tag] : ['Unclassified'];
      }

      const hasDefaultDocumentation = this.checkIfPluginDefaultDocumentFileExists(pluginName, key);
      const defaultDocumentation = hasDefaultDocumentation
        ? this.getPluginDefaultVerbDocumentation(pluginName, key, endPoint, verb)
        : null;
      const verbObject = {
        deprecated: false,
        description,
        responses: this.generatePluginVerbResponses(current),
        summary: '',
        tags,
      };

      _.set(acc, [key, 'paths', endPoint, verb], verbObject);

      const parameters = this.generateVerbParameters(
        verb,
        actionType,
        `/${pluginName}${current.path}`,
      );

      if (_.isEmpty(defaultDocumentation)) {
        if (verb !== 'post') {
          _.set(acc, [key, 'paths', endPoint, verb, 'parameters'], parameters);
        }

        if (verb === 'post' || verb === 'put') {
          let requestBody;

          if (actionType === 'create' || actionType === 'update') {
            const { name, plugin } = _.isObject(current.config.tag)
              ? current.config.tag
              : { tag: current.config.tag };
            const $ref = plugin
              ? `#/components/schemas/New${this.formatTag(plugin, name, true)}`
              : `#/components/schemas/New${_.upperFirst(name)}`;
            requestBody = {
              description: '',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref,
                  },
                },
              },
            };
          } else {
            requestBody = {
              description: '',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      foo: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            };
          }
          _.set(acc, [key, 'paths', endPoint, verb, 'requestBody'], requestBody);
        }
      }

      return acc;
    }, {});
  },

  generatePluginResponseSchema: function(tag) {
    const { actionType, name, plugin } = _.isObject(tag) ? tag : { tag };
    const getter = plugin ? ['plugins', plugin, 'models', name.toLowerCase()] : ['models', name];
    const isModelRelated =
      _.get(strapi, getter) !== undefined &&
      ['find', 'findOne', 'create', 'search', 'update', 'destroy', 'count'].includes(actionType);
    const $ref = plugin
      ? `#/components/schemas/${this.formatTag(plugin, name, true)}`
      : `#/components/schemas/${_.upperFirst(name)}`;

    if (isModelRelated) {
      switch (actionType) {
        case 'find':
          return {
            type: 'array',
            items: {
              $ref,
            },
          };
        case 'count':
          return {
            properties: {
              count: {
                type: 'integer',
              },
            },
          };
        case 'findOne':
        case 'update':
        case 'create':
          return {
            $ref,
          };
        default:
          return {
            properties: {
              foo: {
                type: 'string',
              },
            },
          };
      }
    }

    return {
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
  },

  generatePluginVerbResponses: function(routeObject) {
    const {
      config: { tag },
    } = routeObject;
    const actionType = _.get(tag, 'actionType');
    let schema;

    if (!tag || !actionType) {
      schema = {
        properties: {
          foo: {
            type: 'string',
          },
        },
      };
    } else {
      schema = this.generatePluginResponseSchema(tag);
    }

    return {
      200: {
        description: 'response',
        content: {
          'application/json': {
            schema,
          },
        },
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      404: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      default: {
        description: 'unexpected error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    };
  },

  /**
   * Create the response object https://swagger.io/specification/#responsesObject
   * @param {String} verb
   * @param {Object} routeObject
   * @param {String} tag
   * @returns {Object}
   */
  generateResponses: function(verb, routeObject, tag) {
    const endPoint = routeObject.path.split('/')[1];
    const description = this.generateResponseDescription(verb, tag, endPoint);
    const schema = this.generateResponseSchema(verb, routeObject, tag, endPoint);

    return {
      200: {
        description,
        content: {
          'application/json': {
            schema,
          },
        },
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      404: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      default: {
        description: 'unexpected error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    };
  },

  /**
   * Retrieve all privates attributes from a model
   * @param {Object} attributes
   */
  getPrivateAttributes: function(attributes) {
    const privateAttributes = Object.keys(attributes).reduce((acc, current) => {
      if (attributes[current].private === true) {
        acc.push(current);
      }
      return acc;
    }, []);

    return privateAttributes;
  },

  /**
   * Create a component object with the model's attributes and relations
   * Refer to https://swagger.io/docs/specification/components/
   * @param {String} tag
   * @returns {Object}
   */
  generateResponseComponent: function(tag, pluginName = '', isPlugin = false) {
    // The component's name have to be capitalised
    const [plugin, name] = isPlugin ? this.getModelAndNameForPlugin(tag, pluginName) : [null, null];
    const upperFirstTag = isPlugin ? this.formatTag(plugin, name, true) : _.upperFirst(tag);
    const attributesGetter = isPlugin
      ? [...this.getModelForPlugin(tag, plugin), 'attributes']
      : ['models', tag, 'attributes'];
    const associationGetter = isPlugin
      ? [...this.getModelForPlugin(tag, plugin), 'associations']
      : ['models', tag, 'associations'];
    const attributesObject = _.get(strapi, attributesGetter);
    const privateAttributes = this.getPrivateAttributes(attributesObject);
    const modelAssociations = _.get(strapi, associationGetter);
    const { attributes } = this.getModelAttributes(attributesObject);
    const associationsWithUpload = modelAssociations
      .filter(association => {
        return association.plugin === 'upload';
      })
      .map(obj => obj.alias);

    // We always create two nested components from the main one
    const mainComponent = this.generateMainComponent(attributes, modelAssociations, upperFirstTag);

    // Get Component that doesn't display the privates attributes since a mask is applied
    // Please refer https://github.com/strapi/strapi/blob/585800b7b98093f596759b296a43f89c491d4f4f/packages/strapi/lib/middlewares/mask/index.js#L92-L100
    const getComponent = Object.keys(mainComponent.properties).reduce(
      (acc, current) => {
        if (privateAttributes.indexOf(current) === -1) {
          acc.properties[current] = mainComponent.properties[current];
        }
        return acc;
      },
      { required: mainComponent.required, properties: {} },
    );

    // Special component only for POST || PUT verbs since the upload is made with a different route
    const postComponent = Object.keys(mainComponent).reduce((acc, current) => {
      if (current === 'required') {
        const required = mainComponent.required.slice().filter(attr => {
          return associationsWithUpload.indexOf(attr) === -1 && attr !== 'id' && attr !== '_id';
        });

        if (required.length > 0) {
          acc.required = required;
        }
      }

      if (current === 'properties') {
        const properties = Object.keys(mainComponent.properties).reduce((acc, current) => {
          if (
            associationsWithUpload.indexOf(current) === -1 &&
            current !== 'id' &&
            current !== '_id'
          ) {
            // The post request shouldn't include nested relations of type 2
            // For instance if a product has many tags
            // we expect to find an array of tags objects containing other relations in the get response
            // and since we use to getComponent to generate this one we need to
            // remove this object since we only send an array of tag ids.
            if (_.find(modelAssociations, ['alias', current])) {
              const isArrayProperty =
                _.get(mainComponent, ['properties', current, 'type']) !== undefined;

              if (isArrayProperty) {
                acc[current] = { type: 'array', items: { type: 'string' } };
              } else {
                acc[current] = { type: 'string' };
              }
            } else {
              // If the field is not an association we take the one from the component
              acc[current] = mainComponent.properties[current];
            }
          }

          return acc;
        }, {});

        acc.properties = properties;
      }

      return acc;
    }, {});

    return {
      components: {
        schemas: {
          [upperFirstTag]: getComponent,
          [`New${upperFirstTag}`]: postComponent,
        },
      },
    };
  },

  /**
   * Generate a better description for a response when we can guess what's the user is going to retrieve
   * @param {String} verb
   * @param {String} tag
   * @param {String} endPoint
   * @returns {String}
   */
  generateResponseDescription: function(verb, tag, endPoint) {
    const isModelRelated = strapi.models[tag] !== undefined && tag === endPoint;

    switch (verb.toLocaleLowerCase()) {
      case 'get':
      case 'post':
      case 'put':
        return isModelRelated ? `Retrieve ${tag} document(s)` : 'response';
      case 'delete':
        return isModelRelated
          ? `deletes a single ${tag} based on the ID supplied`
          : 'deletes a single record based on the ID supplied';
      default:
        return 'response';
    }
  },

  /**
   * For each response generate its schema
   * Its schema is either a component when we know what the routes returns otherwise, it returns a dummy schema
   * that the user will modify later
   * @param {String} verb
   * @param {Object} route
   * @param {String} tag
   * @param {String} endPoint
   * @returns {Object}
   */
  generateResponseSchema: function(verb, routeObject, tag) {
    const { handler } = routeObject;
    let [controller, handlerMethod] = handler.split('.');
    let upperFirstTag = _.upperFirst(tag);

    if (verb === 'delete') {
      return {
        type: 'integer',
        format: 'int64',
      };
    }

    // A tag key might be added to a route to tell if a custom endPoint in an api/<model>/config/routes.json
    // Retrieves data from another model it is a faster way to generate the response
    const routeReferenceTag = _.get(routeObject, ['config', 'tag']);
    let isModelRelated = false;
    const shouldCheckIfACustomEndPointReferencesAnotherModel =
      _.isObject(routeReferenceTag) && !_.isEmpty(_.get(routeReferenceTag, 'name'));

    if (shouldCheckIfACustomEndPointReferencesAnotherModel) {
      const { actionType, name, plugin } = routeReferenceTag;
      // A model could be in either a plugin or the api folder
      // The path is different depending on the case
      const getter = !_.isEmpty(plugin)
        ? ['plugins', plugin, 'models', name.toLowerCase()]
        : ['models', name.toLowerCase()];

      // An actionType key might be added to the tag object to guide the algorithm is generating an automatic response
      const isKnownAction = [
        'find',
        'findOne',
        'create',
        'search',
        'update',
        'destroy',
        'count',
      ].includes(actionType);

      // Check if a route points to a model
      isModelRelated = _.get(strapi, getter) !== undefined && isKnownAction;

      if (isModelRelated && isKnownAction) {
        // We need to change the handlerMethod name if it is know to generate the good schema
        handlerMethod = actionType;

        // This is to retrieve the correct component if a custom endpoints references a plugin model
        if (!_.isEmpty(plugin)) {
          upperFirstTag = this.formatTag(plugin, name, true);
        }
      }
    } else {
      // Normal way there's no tag object
      isModelRelated = strapi.models[tag] !== undefined && tag === _.lowerCase(controller);
    }

    // We create a component when we are sure that we can 'guess' what's needed to be sent
    // https://swagger.io/specification/#referenceObject
    if (isModelRelated) {
      switch (handlerMethod) {
        case 'find':
          return {
            type: 'array',
            items: {
              $ref: `#/components/schemas/${upperFirstTag}`,
            },
          };
        case 'count':
          return {
            properties: {
              count: {
                type: 'integer',
              },
            },
          };
        case 'findOne':
        case 'update':
        case 'create':
          return {
            $ref: `#/components/schemas/${upperFirstTag}`,
          };
        default:
          return {
            properties: {
              foo: {
                type: 'string',
              },
            },
          };
      }
    }

    return {
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
  },

  generateTags: function(name, docName, tag = '', isPlugin = false) {
    return [
      {
        name: isPlugin ? tag : _.upperFirst(docName),
      },
    ];
  },

  /**
   * Add a default description when it's implied
   *
   * @param {String} verb
   * @param {String} handler
   * @param {String} tag
   * @param {String} endPoint
   * @returns {String}
   */
  generateVerbDescription: (verb, handler, tag, endPoint, description) => {
    const isModelRelated = strapi.models[tag] !== undefined && tag === endPoint;

    if (description) {
      return description;
    }

    switch (verb) {
      case 'get': {
        const [, controllerMethod] = handler.split('.');

        if (isModelRelated) {
          switch (controllerMethod) {
            case 'count':
              return `Retrieve the numver of ${tag} documents`;
            case 'findOne':
              return `Find one ${tag} record`;
            case 'find':
              return `Find all the ${tag}'s records`;
            default:
              return '';
          }
        }

        return '';
      }
      case 'delete':
        return isModelRelated ? `Delete a single ${tag} record` : 'Delete a record';
      case 'post':
        return isModelRelated ? `Create a new ${tag} record` : 'Create a new record';
      case 'put':
        return isModelRelated ? `Update a single ${tag} record` : 'Update a record';
      case 'patch':
        return '';
      case 'head':
        return '';
      default:
        return '';
    }
  },

  /**
   * Generate the verb parameters object
   * Refer to https://swagger.io/specification/#pathItemObject
   * @param {Sting} verb
   * @param {String} controllerMethod
   * @param {String} endPoint
   */
  generateVerbParameters: function(verb, controllerMethod, endPoint) {
    const params = pathToRegexp
      .parse(endPoint)
      .filter(token => _.isObject(token))
      .reduce((acc, current) => {
        const param = {
          name: current.name,
          in: 'path',
          description: '',
          deprecated: false,
          required: true,
          schema: { type: 'string' },
        };

        return acc.concat(param);
      }, []);

    if (verb === 'get' && controllerMethod === 'find') {
      // parametersOptions corresponds to this section
      // of the documentation https://strapi.io/documentation/guides/filters.html
      return [...params, ...parametersOptions];
    }

    return params;
  },

  /**
   * Retrieve the apis in /api
   * @returns {Array}
   */
  getApis: () => {
    return Object.keys(strapi.api || {});
  },

  getAPIOverrideComponentsDocumentation: function(apiName, docName) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getAPIOverrideDocumentationPath(apiName, docName), 'utf8'),
      );

      return _.get(documentation, 'components', null);
    } catch (err) {
      return null;
    }
  },

  getAPIDefaultTagsDocumentation: function(name, docName) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getAPIOverrideDocumentationPath(name, docName), 'utf8'),
      );

      return _.get(documentation, 'tags', null);
    } catch (err) {
      return null;
    }
  },

  getAPIDefaultVerbDocumentation: function(apiName, docName, routePath, verb) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getAPIOverrideDocumentationPath(apiName, docName), 'utf8'),
      );

      return _.get(documentation, ['paths', routePath, verb], null);
    } catch (err) {
      return null;
    }
  },

  getAPIOverrideDocumentationPath: function(apiName, docName) {
    return path.join(
      strapi.config.appPath,
      'api',
      apiName,
      'documentation',
      'overrides',
      this.getDocumentationVersion(),
      `${docName}.json`,
    );
  },

  /**
   * Given an api retrieve its endpoints
   * @param {String}
   * @returns {Array}
   */
  getApiRoutes: apiName => {
    return _.get(strapi, ['api', apiName, 'config', 'routes'], []);
  },

  getDocumentationOverridesPath: function(apiName) {
    return path.join(
      strapi.config.appPath,
      'api',
      apiName,
      'documentation',
      this.getDocumentationVersion(),
      'overrides',
    );
  },

  /**
   * Given an api from /api retrieve its version directory
   * @param {String} apiName
   * @returns {Path}
   */
  getDocumentationPath: function(apiName) {
    return path.join(
      strapi.config.appPath,
      'api',
      apiName,
      'documentation',
      this.getDocumentationVersion(),
    );
  },

  getFullDocumentationPath: () => {
    return path.join(strapi.config.appPath, 'plugins', 'documentation', 'documentation');
  },

  /**
   * Retrieve the plugin's configuration version
   */
  getDocumentationVersion: () => {
    const version = strapi.plugins['documentation'].config.info.version;

    return version;
  },

  /**
   * Retrieve the documentation plugin documentation directory
   */
  getMergedDocumentationPath: function(version = this.getDocumentationVersion()) {
    return path.join(strapi.config.appPath, 'plugins', 'documentation', 'documentation', version);
  },

  /**
   * Retrieve the model's attributes
   * @param {Objet} modelAttributes
   * @returns {Object} { associations: [{ name: 'foo', getter: [], tag: 'foos' }], attributes }
   */
  getModelAttributes: function(modelAttributes) {
    const associations = [];
    const attributes = Object.keys(modelAttributes)
      .map(attr => {
        const attribute = modelAttributes[attr];
        const isField =
          !attribute.hasOwnProperty('model') && !attribute.hasOwnProperty('collection');

        if (!isField) {
          const name = attribute.model || attribute.collection;
          const getter =
            attribute.plugin !== undefined
              ? ['plugins', attribute.plugin, 'models', name, 'attributes']
              : ['models', name, 'attributes'];
          associations.push({ name, getter, tag: attr });
        }

        return attr;
      })
      .reduce((acc, current) => {
        acc[current] = modelAttributes[current];

        return acc;
      }, {});

    return { associations, attributes };
  },

  /**
   * Refer to https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#dataTypes
   * @param {String} type
   * @returns {String}
   */
  getType: type => {
    switch (type) {
      case 'string':
      case 'byte':
      case 'binary':
      case 'password':
      case 'email':
      case 'text':
      case 'enumeration':
      case 'date':
        return 'string';
      case 'float':
      case 'decimal':
      case 'double':
        return 'number';
      case 'integer':
      case 'long':
        return 'integer';
      default:
        return type;
    }
  },

  getPluginDefaultVerbDocumentation: function(pluginName, docName, routePath, verb) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getPluginOverrideDocumentationPath(pluginName, docName), 'utf8'),
      );

      return _.get(documentation, ['paths', routePath, verb], null);
    } catch (err) {
      return null;
    }
  },

  getPluginDefaultTagsDocumentation: function(pluginName, docName) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getPluginOverrideDocumentationPath(pluginName, docName), 'utf8'),
      );

      return _.get(documentation, ['tags'], null);
    } catch (err) {
      return null;
    }
  },

  getPluginOverrideComponents: function(pluginName, docName) {
    try {
      const documentation = JSON.parse(
        fs.readFileSync(this.getPluginOverrideDocumentationPath(pluginName, docName), 'utf8'),
      );

      return _.get(documentation, 'components', null);
    } catch (err) {
      return null;
    }
  },

  getPluginOverrideDocumentationPath: function(pluginName, docName) {
    const defaultPath = path.join(
      strapi.config.appPath,
      'plugins',
      pluginName,
      'documentation',
      this.getDocumentationVersion(),
      'overrides',
    );

    if (docName) {
      return path.resolve(defaultPath, `${docName.json}`);
    } else {
      return defaultPath;
    }
  },

  /**
   * Given a plugin retrieve its documentation version
   */
  getPluginDocumentationPath: function(pluginName) {
    return path.join(
      strapi.config.appPath,
      'plugins',
      pluginName,
      'documentation',
      this.getDocumentationVersion(),
    );
  },

  /**
   * Retrieve all plugins that have a description inside one of its route
   * @return {Arrray}
   */
  getPluginsWithDocumentationNeeded: function() {
    return Object.keys(strapi.plugins).reduce((acc, current) => {
      const isDocumentationNeeded = this.isPluginDocumentationNeeded(current);

      if (isDocumentationNeeded) {
        return acc.concat(current);
      }

      return acc;
    }, []);
  },

  /**
   * Retrieve all the routes that have a description from a plugin
   * @param {String} pluginName
   * @returns {Array}
   */
  getPluginRoutesWithDescription: function(pluginName) {
    return _.get(strapi, ['plugins', pluginName, 'config', 'routes'], []).filter(
      route => _.get(route, ['config', 'description']) !== undefined,
    );
  },

  /**
   * Given a string and a pluginName retrieve the model and the pluginName
   * @param {String} string
   * @param {Sting} pluginName
   * @returns {Array}
   */
  getModelAndNameForPlugin: (string, pluginName) => {
    return _.replace(string, `${pluginName}-`, `${pluginName}.`).split('.');
  },

  /**
   * Retrieve the path needed to get a model from a plugin
   * @param (String) string
   * @param {String} plugin
   * @returns {Array}
   */
  getModelForPlugin: function(string, pluginName) {
    const [plugin, model] = this.getModelAndNameForPlugin(string, pluginName);

    return ['plugins', plugin, 'models', _.lowerCase(model)];
  },

  /**
   * Check whether or not a plugin needs documentation
   * @param {String} pluginName
   * @returns {Boolean}
   */
  isPluginDocumentationNeeded: function(pluginName) {
    const pluginRoutesWithDescription = this.getPluginRoutesWithDescription(pluginName);

    return pluginRoutesWithDescription.length > 0;
  },

  /**
   * Merge two components by replacing the default ones by the overides and keeping the others
   * @param {Object} initObj
   * @param {Object} srcObj
   * @returns {Object}
   */
  mergeComponents: (initObj, srcObj) => {
    const cleanedObj = Object.keys(_.get(initObj, 'schemas', {})).reduce((acc, current) => {
      const targetObj = _.get(srcObj, ['schemas'], {}).hasOwnProperty(current) ? srcObj : initObj;

      _.set(acc, ['schemas', current], _.get(targetObj, ['schemas', current], {}));

      return acc;
    }, {});

    return _.merge(cleanedObj, srcObj);
  },

  mergePaths: function(initObj, srcObj) {
    return Object.keys(initObj.paths).reduce((acc, current) => {
      if (_.get(srcObj, ['paths'], {}).hasOwnProperty(current)) {
        const verbs = Object.keys(initObj.paths[current]).reduce((acc1, curr) => {
          const verb = this.mergeVerbObject(
            initObj.paths[current][curr],
            _.get(srcObj, ['paths', current, curr], {}),
          );
          _.set(acc1, [curr], verb);

          return acc1;
        }, {});
        _.set(acc, ['paths', current], verbs);
      } else {
        _.set(acc, ['paths', current], _.get(initObj, ['paths', current], {}));
      }

      return acc;
    }, {});
  },

  mergeTags: (initObj, srcObj) => {
    return _.get(srcObj, 'tags', _.get(initObj, 'tags', []));
  },

  /**
   * Merge two verb objects with a customizer
   * @param {Object} initObj
   * @param {Object} srcObj
   * @returns {Object}
   */
  mergeVerbObject: function(initObj, srcObj) {
    return _.mergeWith(initObj, srcObj, (objValue, srcValue) => {
      if (_.isPlainObject(objValue)) {
        return Object.assign(objValue, srcValue);
      }

      return srcValue;
    });
  },

  retrieveDocumentation: function(name, isPlugin = false) {
    const documentationPath = isPlugin
      ? [strapi.config.appPath, 'plugins', name, 'documentation', this.getDocumentationVersion()]
      : [strapi.config.appPath, 'api', name, 'documentation', this.getDocumentationVersion()];

    try {
      const documentationFiles = fs
        .readdirSync(path.resolve(documentationPath.join('/')))
        .filter(el => el.includes('.json'));

      return documentationFiles.reduce((acc, current) => {
        try {
          const doc = JSON.parse(
            fs.readFileSync(path.resolve([...documentationPath, current].join('/')), 'utf8'),
          );
          acc.push(doc);
        } catch (err) {
          // console.log(path.resolve([...documentationPath, current].join('/')), err);
        }

        return acc;
      }, []);
    } catch (err) {
      return [];
    }
  },

  /**
   * Retrieve all documentation files from either the APIs or the plugins
   * @param {Boolean} isPlugin
   * @returns {Array}
   */
  retrieveDocumentationFiles: function(isPlugin = false, version = this.getDocumentationVersion()) {
    const array = isPlugin ? this.getPluginsWithDocumentationNeeded() : this.getApis();

    return array.reduce((acc, current) => {
      const documentationPath = isPlugin
        ? [strapi.config.appPath, 'plugins', current, 'documentation', version]
        : [strapi.config.appPath, 'api', current, 'documentation', version];

      try {
        const documentationFiles = fs
          .readdirSync(path.resolve(documentationPath.join('/')))
          .filter(el => el.includes('.json'));

        documentationFiles.forEach(el => {
          try {
            let documentation = JSON.parse(
              fs.readFileSync(path.resolve([...documentationPath, el].join('/')), 'utf8'),
            );
            /* eslint-disable indent */
            const overrideDocumentationPath = isPlugin
              ? path.resolve(
                  strapi.config.appPath,
                  'plugins',
                  current,
                  'documentation',
                  version,
                  'overrides',
                  el,
                )
              : path.resolve(
                  strapi.config.appPath,
                  'api',
                  current,
                  'documentation',
                  version,
                  'overrides',
                  el,
                );
            /* eslint-enable indent */
            let overrideDocumentation;

            try {
              overrideDocumentation = JSON.parse(
                fs.readFileSync(overrideDocumentationPath, 'utf8'),
              );
            } catch (err) {
              overrideDocumentation = null;
            }

            if (!_.isEmpty(overrideDocumentation)) {
              documentation.paths = this.mergePaths(documentation, overrideDocumentation).paths;
              documentation.tags = _.cloneDeep(
                this.mergeTags(documentation, overrideDocumentation),
              );
              const documentationComponents = _.get(documentation, 'components', {});
              const overrideComponents = _.get(overrideDocumentation, 'components', {});
              const mergedComponents = this.mergeComponents(
                documentationComponents,
                overrideComponents,
              );

              if (!_.isEmpty(mergedComponents)) {
                documentation.components = mergedComponents;
              }
            }

            acc.push(documentation);
          } catch (err) {
            console.log(
              `Unable to access the documentation for ${[...documentationPath, el].join('/')}`,
            );
          }
        });
      } catch (err) {
        console.log(
          `Unable to retrieve documentation for the ${isPlugin ? 'plugin' : 'api'} ${current}`,
        );
      }

      return acc;
    }, []);
  },

  retrieveDocumentationVersions: function() {
    return fs
      .readdirSync(this.getFullDocumentationPath())
      .map(version => {
        try {
          const doc = JSON.parse(
            fs.readFileSync(
              path.resolve(this.getFullDocumentationPath(), version, 'full_documentation.json'),
            ),
          );
          const generatedDate = _.get(doc, ['info', 'x-generation-date'], null);

          return { version, generatedDate, url: '' };
        } catch (err) {
          return null;
        }
      })
      .filter(x => x);
  },

  retrieveFrontForm: async function() {
    const config = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'documentation',
        key: 'config',
      })
      .get();
    const forms = JSON.parse(JSON.stringify(form));

    _.set(forms, [0, 0, 'value'], config.restrictedAccess);
    _.set(forms, [0, 1, 'value'], config.password || '');

    return forms;
  },
};
