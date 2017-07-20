'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  menu: {
    sections: [
      {
        name: 'menu.section.global-settings',
        items: [
            {
            slug: 'general',
            name: 'menu.item.general',
            icon: 'globe'
          },
          {
            slug: 'languages',
            name: 'menu.item.languages',
            icon: 'language'
          },
          {
            slug: 'advanced',
            name: 'menu.item.advanced',
            icon: 'cogs'
          }
        ]
      },
      {
        name: 'menu.section.environments',
        items: [
          {
            slug: 'databases',
            name: 'menu.item.databases',
            icon: 'database'
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

  general: () => ({
    name: 'form.general.name',
    description: 'form.general.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.general.item.name',
            target: 'package.name',
            type: 'string',
            value: _.get(strapi.config, 'name', null),
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.item.description',
            target: 'package.description',
            type: 'string',
            value: _.get(strapi.config, 'description', null),
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.item.version',
            target: 'package.version',
            type: 'string',
            value: _.get(strapi.config, 'version', null),
            validations : {
              regex: '^(\\d+\\.)?(\\d+\\.)?(\\*|\\d+)$',
              required: true
            }
          }
        ]
      }
    ]
  }),

  advanced: () => ({
    name: 'form.advanced.name',
    description: 'form.advanced.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.advanced.item.admin',
            target: 'general.admin',
            type: 'string',
            value: _.get(strapi.config, 'general.admin', null),
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.advanced.item.prefix',
            target: 'general.prefix',
            type: 'string',
            value: _.get(strapi.config, 'general.prefix', null),
            validations : {
              maxLength: 255
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
        name: 'form.security.item.session',
        items: [
          {
            name: 'form.security.item.session.key',
            target: 'security.session.key',
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.security.session.key`, null),
            validations: {
              required: true
            }
          },
          {
            name: 'form.security.item.session.maxAge',
            target: 'security.session.maxAge',
            type: 'number',
            value: _.get(strapi.config, `environments.${env}.security.session.maxAge`, null),
            validations: {}
          }
        ]
      },
      {
        name: '',
        items: [
          {
            name: 'form.security.item.xframe',
            target: 'security.xframe',
            type: 'enum',
            value: _.get(strapi.config, `environments.${env}.security.xframe`, null),
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
              }
            ],
            validations: {
              required: true
            }
          },
          {
            name: 'form.security.item.xssProtection',
            target: 'security.xssProtection',
            type: 'boolean',
            value: _.get(strapi.config, `environments.${env}.security.xssProtection`, null),
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
            name: 'form.security.item.cors.origin',
            target: 'security.cors.origin',
            type: 'string',
            value: _.get(strapi.config, `environments.${env}.security.cors.origin`, null),
            validations: {}
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
          }
        ]
      }
    ]
  }),

  i18n: env => ({
    name: '',
    description: '',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.i18n.chose',
            target: 'i18n.i18n.defaultLocale',
            type: 'select',
            items: strapi.plugins['settings-manager'].services.languages
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
      }
    });
  },

  getLanguages: () => {
    return _.map(strapi.config.i18n.locales, language => {
      return {
        name: language,
        active: (strapi.config.i18n.defaultLocale === language)
      }
    });
  },

  getItems: model => _.flatten(_.map(model.sections, section => section.items)),

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

    const checkType = (input, { type, target, items }) => {
      if ((type === 'string' || type === 'text') && !_.isString(input)) errors.push({
        target: target,
        message: 'request.error.type.string'
      });

      if (type === 'number' && !_.isNumber(input)) errors.push({
        target: target,
        message: 'request.error.type.number'
      });

      if (type === 'boolean' && !_.isBoolean(input)) errors.push({
        target: target,
        message: 'request.error.type.boolean'
      });

      if (type === 'select' && !_.find(items, { value: input })) errors.push({
        target: target,
        message: 'request.error.type.select'
      });
    };

    const checkValidations = (input, item) => {
      _.forEach(item.validations, (value, key) => {
        if (key === 'required' && (_.isNull(input) || _.isEmpty(input) || _.isUndefined(input))) errors.push({
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

    return errors;
  },

  updateSettings: (params, items, env = '') => {
    const appPath = strapi.config.appPath;
    const errors = [];

    _.forEach(items, ({ target }) => {
      if (_.has(params, target)) {
        const input = _.get(params, target, null);
        const [file, ...objPath] = target.split('.');

        const filePath = (file === 'package') ? path.join(appPath, 'package.json') : path.join(appPath, 'config', `${env ? `environments/${env}` : ''}`, `${_.replace(file, '.', '/')}.json`);

        try {
          const fileContent = require(filePath);

          _.set(fileContent, objPath, input);

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
      }
    });

    return errors;
  }
};
