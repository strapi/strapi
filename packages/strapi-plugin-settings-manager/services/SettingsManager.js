'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const exec = require('child_process').execSync;

module.exports = {
  menu: {
    sections: [
      {
        name: 'menu.section.global-settings',
        items: [
            {
            slug: 'application',
            name: 'menu.item.application',
            icon: 'globe'
          },
          {
            slug: 'languages',
            name: 'menu.item.languages',
            icon: 'language'
          }
        ]
      },
      {
        name: 'menu.section.environments',
        items: [
          {
            slug: 'databases',
            name: 'menu.item.database',
            icon: 'database'
          },
          {
            slug: 'request',
            name: 'menu.item.request',
            icon: 'compress'
          },
          {
            slug: 'response',
            name: 'menu.item.response',
            icon: 'upload'
          },
          {
            slug: 'security',
            name: 'menu.item.security',
            icon: 'shield'
          },
          {
            slug: 'server',
            name: 'menu.item.server',
            icon: 'server'
          }
        ]
      }
    ]
  },

  application: async () => {
    const application = await strapi.store({
      environment: '',
      type: 'core',
      key: 'application'
    }).get();

    return {
      name: 'form.application.name',
      description: 'form.application.description',
      sections: [
        {
          name: '',
          items: [
            {
              name: 'form.application.item.name',
              target: 'application.name',
              source: 'db',
              type: 'string',
              value: _.get(application, 'name', null),
              validations : {
                maxLength: 255,
                required: true
              }
            },
            {
              name: 'form.application.item.description',
              target: 'application.description',
              source: 'db',
              type: 'string',
              value: _.get(application, 'description', null),
              validations : {
                maxLength: 255,
                required: true
              }
            },
            {
              name: 'form.application.item.version',
              target: 'package.version',
              type: 'string',
              value: _.get(strapi.config, 'info.version', null),
              validations : {
                regex: '^(\\d+\\.)?(\\d+\\.)?(\\*|\\d+)$',
                required: true
              }
            }
          ]
        }
      ]
    }
  },

  request: env => ({
    name: 'form.request.name',
    description: 'form.request.description',
    sections: [
      {
        name: 'form.request.item.logger',
        items: [
          {
            name: 'form.request.item.logger.level',
            target: 'request.logger.level',
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.request.logger.level`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.request.item.logger.exposeInContext',
            target: 'request.logger.exposeInContext',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.request.logger.exposeInContext`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.request.item.logger.requests',
            target: 'request.logger.requests',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.request.logger.requests`, null),
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.request.item.parser',
        items: [
          {
            name: 'form.request.item.parser.enabled',
            target: 'request.parser.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.request.parser.enabled`, null),
            items: [
              {
                name: 'form.request.item.parser.multipart',
                target: 'request.parser.multipart',
                type: 'boolean',
                value: _.get(strapi.config, `environments.${env}.request.parser.multipart`, null),
                validations : {
                  required: true
                }
              }
            ]
          }
        ]
      },
      {
        name: 'form.request.item.router',
        items: [
          {
            name: 'form.request.item.router.prefix',
            target: 'request.router.prefix',
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.request.router.prefix`, null),
            validations : {
              required: true
            }
          }
        ]
      }
    ]
  }),

  response: env => ({
    name: 'form.response.name',
    description: 'form.response.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.response.item.gzip.enabled',
            target: 'response.gzip.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.response.gzip.enabled`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.response.item.responseTime.enabled',
            target: 'response.responseTime.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.response.responseTime.enabled`, null),
            validations: {
              required: true
            }
          }
        ]
      }
    ]
  }),

  security: env => ({
    name: 'form.security.name',
    description: 'form.security.description',
    sections: [
      {
        name: 'form.security.item.csrf',
        items: [
          {
            name: 'form.security.item.csrf.enabled',
            target: 'security.csrf.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.csrf.enabled`, null),
            items: [
              {
                name: 'form.security.item.csrf.key',
                target: 'security.csrf.key',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.csrf.key`, null),
                validations: {}
              },
              {
                name: 'form.security.item.csrf.secret',
                target: 'security.csrf.secret',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.csrf.secret`, null),
                validations: {}
              },
              {
                name: 'form.security.item.csrf.cookie',
                target: 'security.csrf.cookie',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.csrf.cookie`, null),
                validations: {}
              },
              {
                name: 'form.security.item.csrf.angular',
                target: 'security.csrf.angular',
                type: 'boolean',
                value: _.get(strapi.config, `environments.${env}.security.csrf.angular`, null),
                validations: {}
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.security.item.p3p',
        items: [
          {
            name: 'form.security.item.p3p.enabled',
            target: 'security.p3p.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.p3p.enabled`, null),
            items: [
              {
                name: 'form.security.item.p3p.value',
                target: 'security.p3p.value',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.p3p.value`, null),
                validations: {
                  required: true
                }
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.security.item.hsts',
        items: [
          {
            name: 'form.security.item.hsts.enabled',
            target: 'security.hsts.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.hsts.enabled`, null),
            items: [
              {
                name: 'form.security.item.hsts.maxAge',
                target: 'security.hsts.maxAge',
                type: 'number',
                value: _.get(strapi.config, `environments.${env}.security.hsts.maxAge`, null),
                validations: {
                  required: true
                }
              },
              {
                name: 'form.security.item.hsts.includeSubDomains',
                target: 'security.hsts.includeSubDomains',
                type: 'boolean',
                value: _.get(strapi.config, `environments.${env}.security.hsts.includeSubDomains`, null),
                validations: {}
              },
              {
                name: 'form.security.item.hsts.preload',
                target: 'security.hsts.preload',
                type: 'boolean',
                value: _.get(strapi.config, `environments.${env}.security.hsts.preload`, null),
                validations: {}
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.security.item.xframe',
        items: [
          {
            name: 'form.security.item.xframe.enabled',
            target: 'security.xframe.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.xframe.enabled`, null),
            items: [
              {
                name: 'form.security.item.xframe.value',
                target: 'security.xframe.value',
                type: 'enum',
                value: _.get(strapi.config, `environments.${env}.security.xframe.value`, null),
                items: [
                  {
                    name: 'form.security.item.xframe.deny',
                    value: 'DENY',
                  },
                  {
                    name: 'form.security.item.xframe.sameorigin',
                    value: 'SAMEORIGIN',
                  },
                  {
                    name: 'form.security.item.xframe.allow-from',
                    value: 'ALLOW-FROM',
                    items: [{
                      name: '',
                      target: 'security.xframe.value.nested',
                      type: 'string',
                      value: '',
                      validations: {
                        required: true
                      }
                    }]
                  }
                ],
                validations: {
                  required: true
                }
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.security.item.xssProtection',
        items: [
          {
            name: 'form.security.item.xssProtection.enabled',
            target: 'security.xssProtection.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.xssProtection.enabled`, null),
            items: [
              {
                name: 'form.security.item.xssProtection.mode',
                target: 'security.xssProtection.mode',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.xssProtection.mode`, null),
                validations: {}
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      },
      {
        name: 'form.security.item.cors',
        items: [
          {
            name: 'form.security.item.cors.enabled',
            target: 'security.cors.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.cors.enabled`, null),
            items: [
              {
                name: 'form.security.item.cors.origin',
                target: 'security.cors.origin',
                type: 'string',
                value: _.get(strapi.config, `environments.${env}.security.cors.origin`, null),
                validations: {
                  required: true
                }
              }
            ],
            validations: {
              required: true
            }
          }
        ]
      }
    ]
  }),

  server: env => ({
    name: 'form.server.name',
    description: 'form.server.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.server.item.host',
            target: 'server.host',
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.server.host`, null),
            validations: {}
          },
          {
            name: 'form.server.item.port',
            target: 'server.port',
            type: 'number',
            value: _.get(strapi.config, `environments.${env}.server.port`, null),
            validations: {}
          },
          {
            name: 'form.server.item.cron',
            target: 'server.cron.enabled',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.server.cron.enabled`, null)
          }
        ]
      }
    ]
  }),

  i18n: env => ({
    name: 'form.language.name',
    description: 'form.language.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.language.choose',
            target: 'language.defaultLocale',
            type: 'select',
            items: strapi.plugins['settings-manager'].services.languages
          }
        ]
      }
    ]
  }),

  databases: (name, env) => ({
    name: 'form.database.name',
    description: 'form.database.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.database.item.name',
            target: `database.connections.${name}.name`,
            type: 'string',
            value: name,
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.connector',
            target: `database.connections.${name}.connector`,
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.connector`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.client',
            target: `database.connections.${name}.settings.client`,
            type: 'select',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.client`, null),
            items: [
              {
                name: 'form.database.item.provider.mongo',
                value: 'mongo',
                port: 27017
              },
              {
                name: 'form.database.item.provider.postgres',
                value: 'postgres',
                port: 5432
              },
              {
                name: 'form.database.item.provider.mysql',
                value: 'mysql',
                port: 3306
              },
              {
                name: 'form.database.item.provider.sqlite3',
                value: 'sqlite3',
                port: 1433
              },
              {
                name: 'form.database.item.provider.redis',
                value: 'redis',
                port: 6379
              }
            ],
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.host',
            target: `database.connections.${name}.settings.host`,
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.host`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.port',
            target: `database.connections.${name}.settings.port`,
            type: 'number',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.port`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.database',
            target: `database.connections.${name}.settings.database`,
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.database`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.database.item.username',
            target: `database.connections.${name}.settings.username`,
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.username`, null),
            validations: {}
          },
          {
            name: 'form.database.item.password',
            target: `database.connections.${name}.settings.password`,
            type: 'password',
            value: _.get(strapi.config, `environments.${env}.database.connections.${name}.settings.password`, null),
            validations: {}
          }
        ]
      },
      {
        name: '',
        items: [
          {
            name: 'form.database.item.default',
            target: `database.defaultConnection`,
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.database.defaultConnection`, null),
            validations: {
              required: true
            }
          }
        ]
      }
    ]
  }),

  getEnvironments: () => {
    return _.map(_.keys(strapi.config.environments), environment => {
      return {
        name: environment,
        active: (strapi.config.environment === environment)
      };
    });
  },

  getLanguages: () => {
    return _.map(strapi.config.language.locales, language => {
      return {
        name: language,
        active: (strapi.config.language.defaultLocale === language)
      };
    });
  },

  getDatabases: env => {
    const databases = [];

    const databasesUsed = [];
    _.forEach(strapi.models, model => {
      databasesUsed.push(model.connection);
    });

    _.forEach(strapi.config.environments[env].database.connections, (connection, name) =>  databases.push({
      connector: _.get(connection, 'connector'),
      letter: strapi.plugins['settings-manager'].services.settingsmanager.getClientLetter(_.get(connection, 'settings.client')),
      color: strapi.plugins['settings-manager'].services.settingsmanager.getClientColor(_.get(connection, 'settings.client')),
      name,
      host: _.get(connection, 'settings.host'),
      database: _.get(connection, 'settings.database'),
      active: (_.get(strapi.config, `environments.${env}.database.defaultConnection`) === name),
      isUsed: _.includes(databasesUsed, name)
    }));

    return databases;
  },

  getClientConnector: client => {
    const bookshelfClients = ['postgres', 'mysql', 'sqlite3'];
    const mongooseClients = ['mongo'];
    const redisClients = ['redis'];

    let connector;
    if (_.indexOf(bookshelfClients, client) !== -1) connector = 'strapi-bookshelf';
    if (_.indexOf(mongooseClients, client) !== -1) connector = 'strapi-mongoose';
    if (_.indexOf(redisClients, client) !== -1) connector = 'strapi-redis';

    return connector;
  },

  getClientColor: client => {
    switch (client) {
      case 'postgres':
        return '#ffb500';
        break;
      case 'mysql':
        return '#4479a1';
        break;
      case 'redis':
        return '#ff5d00';
        break;
      case 'mongo':
        return '#43b121';
        break;
      case 'sqlite3':
        return '#006fff';
        break;
      default:
        return '#000000';
    }
  },

  getClientLetter: client => {
    switch (client) {
      case 'postgres':
        return 'PG';
        break;
      case 'mysql':
        return 'MY';
        break;
      default:
        return _.upperCase(_.head(client));
    }
  },

  getItems: model => {
    return _.flatten(_.map(model.sections, section => {
      let items = section.items;

      _.forEach(items, item => { if (item.type === 'boolean' && _.has(item, 'items')) items = _.concat(items, item.items) });

      return items
    }));
  },

  cleanParams: (params, items) => {
    const cleanParams = {};

    _.forEach(items, ({ target }) => _.has(params, target) ? _.set(cleanParams, target, _.get(params, target)) : '');

    return cleanParams;
  },

  formatErrors: errors => _.map(_.groupBy(errors, 'target'), (errs, target) => {
    return {
      target,
      messages: _.map(errs, err => {
        return {
          id: err.message,
          params: _.get(err, 'params', undefined)
        };
      })
    };
  }),

  paramsValidation: (params, items) => {
    let errors = [];

    const reformat = (value, format) => {
      if (format === 'number') try { return parseFloat(number) } catch (e) { return null };
      if (format === 'boolean') return value === 'true';

      return value;
    };

    const checkType = (input, { type, target, items }) => {
      if ((type === 'string' || type === 'text' || type === 'password') && !_.isString(input)) return errors.push({
        target: target,
        message: 'request.error.type.string'
      });

      if (type === 'number' && !_.isNumber(input)) return errors.push({
        target: target,
        message: 'request.error.type.number'
      });

      if (type === 'boolean' && !_.isBoolean(input)) return errors.push({
        target: target,
        message: 'request.error.type.boolean'
      });

      if (type === 'select' && !_.find(items, { value: input })) return errors.push({
        target: target,
        message: 'request.error.type.select'
      });

      if (type === 'enum' && !_.find(items, { value: input })) {
        const key = input.split('.')[0];
        input = _.drop(input.split('.')).join('.');

        const item = _.find(items, { value: key });

        if (!item) return errors.push({
          target: target,
          message: 'request.error.type.enum'
        });

        input = reformat(input, item.type);
        params[target] = input;

        _.forEach(item.items, subItem => {
          subItem.target = target;
          if (_.has(params, subItem.target)) {
            const input = _.get(params, subItem.target, null);

            checkType(input, subItem);
            checkValidations(input, subItem);
          }
        });
      }
    };

    const checkValidations = (input, item) => {
      _.forEach(item.validations, (value, key) => {
        if (key === 'required' && (_.isNull(input) || (_.isString(input) && _.isEmpty(input)) || _.isUndefined(input))) errors.push({
          target: item.target,
          message: 'request.error.validation.required'
        });

        if (key === 'regex' && !new RegExp(value).test(input)) errors.push({
          target: item.target,
          message: 'request.error.validation.regex'
        });

        if (key === 'max' && parseInt(input) > value) errors.push({
          target: item.target,
          message: 'request.error.validation.max'
        });

        if (key === 'min' && parseInt(input) < value) errors.push({
          target: item.target,
          message: 'request.error.validation.min'
        });

        if (key === 'maxLength' && input.length > value) errors.push({
          target: item.target,
          message: 'request.error.validation.maxLength'
        });

        if (key === 'minLength' && input.length  < value) errors.push({
          target: item.target,
          message: 'request.error.validation.minLength'
        });
      });
    };

    _.forEach(items, item => {
      if (_.has(params, item.target)) {
        const input = _.get(params, item.target, null);

        checkType(input, item);
        checkValidations(input, item);
      }
    });

    return [params, errors];
  },

  updateSettings: async (params, items, env = '') => {
    const appPath = strapi.config.appPath;
    const errors = [];

    async function asyncForEach(array, callback) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }

    await asyncForEach(items, async ({ target, source }) => {
      if (_.has(params, target)) {
        let input = _.get(params, target, null);
        const [file, ...objPath] = target.split('.');

        if (source === 'db') {
          const store = strapi.store({
            environment: env,
            type: 'core',
            key: file
          });

          const data = await store.get();

          _.set(data, objPath, input);

          await store.set({value: data});

          return;
        }

        if (target === 'language.defaultLocale') input = _.lowerCase(input).replace(/ /g, '_');

        const filePath = (file === 'package') ? path.join(appPath, 'package.json') : path.join(appPath, 'config', `${env ? `environments/${env}` : ''}`, `${_.replace(file, '.', '/')}.json`);

        try {
          const fileContent = require(filePath);

          _.set(fileContent, objPath, input);

          try {
            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
          } catch (e) {
            errors.push({
              target,
              message: 'request.error.config',
              params: {
                filePath: filePath
              }
            });
          }
        } catch (e) {
          errors.push({
            target,
            message: 'request.error.config',
            params: {
              filePath: filePath
            }
          });
        }
      }
    });

    return errors;
  },

  installDependency: (params, name) => {
    const clientsDependencies = {
      postgres: 'pg',
      mysql: 'mysql',
      sqlite3: 'sqlite3'
    };

    const client = _.get(clientsDependencies, _.get(params, `database.connections.${name}.settings.client`));
    const installedClient = _.indexOf(_.keys(strapi.config.info.dependencies), client) !== -1;
    const connector = _.get(params, `database.connections.${name}.connector`);
    const installedConnector = _.indexOf(_.keys(strapi.config.info.dependencies), connector) !== -1;

    if (connector && !installedConnector) {
      strapi.log.info(`Installing ${connector} dependency ...`);
      exec(`npm install ${connector}@alpha`);
    }

    if (client && !installedClient) {
      strapi.log.info(`Installing ${client} dependency ...`);
      exec(`npm install ${client}`);
    }
  },

  cleanDependency: (env, config) => {
    const availableConnectors = ['strapi-mongoose', 'strapi-bookshelf', 'strapi-redis'];
    let usedConnectors = [];
    const errors = [];

    _.forEach(_.keys(strapi.config.environments), environment => {
      let connections = strapi.config.environments[environment].database.connections;

      if (environment === env) {
        connections = config.database.connections;
      }

      _.forEach(connections, connection => {
        if (_.get(connection, 'connector')) {
          usedConnectors.push(connection.connector);
        }
      });
    });

    usedConnectors = _.uniq(usedConnectors);

    _.forEach(availableConnectors, connector => {
      const installed = _.indexOf(_.keys(strapi.config.info.dependencies), connector) !== -1;
      const used = _.indexOf(usedConnectors, connector) !== -1;

      if (installed && !used) {
        const filePath = path.join(strapi.config.appPath, 'package.json');

        try {
          const fileContent = require(filePath);

          _.set(fileContent, `dependencies.${connector}`, undefined);

          try {
            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
          } catch (e) {
            errors.push({
              target,
              message: 'request.error.config',
              params: {
                filePath: filePath
              }
            });
          }
        } catch (e) {
          errors.push({
            target,
            message: 'request.error.config',
            params: {
              filePath: filePath
            }
          });
        }
      }
    });

    return errors;
  },

  getModelPath: model => {
    let searchFilePath;
    const errors = [];
    const searchFileName = `${model}.settings.json`;
    const apiPath = path.join(strapi.config.appPath, 'api');

    let apis;
    try {
      apis = fs.readdirSync(apiPath);

      _.forEach(apis, api => {
        const modelsPath = path.join(apiPath, api, 'models');

        let models;
        try {
          models = fs.readdirSync(modelsPath);

          const modelIndex = _.indexOf(_.map(models, model => _.toLower(model)), searchFileName);

          if (modelIndex !== -1) searchFilePath = `${modelsPath}/${models[modelIndex]}`;
        } catch (e) {
          errors.push({
            id: 'request.error.folder.read',
            params: {
              folderPath: modelsPath
            }
          });
        }
      });
    } catch (e) {
      errors.push({
        id: 'request.error.folder.read',
        params: {
          folderPath: apiPath
        }
      });
    }

    return [searchFilePath, errors];
  }
};
