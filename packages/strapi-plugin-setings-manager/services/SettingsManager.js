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
            icon: 'databases'
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

  general: {
    name: 'form.general',
    description: 'form.general.description',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.general.name',
            target: 'package.name',
            type: 'string',
            value: _.get(strapi.config, 'name', null),
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.description',
            target: 'package.description',
            type: 'string',
            value: _.get(strapi.config, 'description', null),
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.version',
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
  },

  security: env => {
    return {
      name: 'form.security',
      description: 'form.security.description',
      sections: [
        {
          name: 'form.security.session',
          items: [
            {
              name: 'form.security.session.key',
              target: 'security.session.key',
              type: 'string',
              value: _.get(strapi.config, `environments.${env}.security.session.key`, null),
              validations: {
                required: true
              }
            },
            {
              name: 'form.security.session.maxAge',
              target: 'security.session.maxAge',
              type: 'number',
              value: _.get(strapi.config, `environments.${env}.security.session.maxAge`, null)
            }
          ]
        },
        {
          name: '',
          items: [
            {
              name: 'form.security.xframe',
              target: 'security.xframe',
              type: 'enum',
              value: _.get(strapi.config, `environments.${env}.security.xframe`, null),
              items: [
                {
                  name: 'form.security.xframe.deny',
                  value: 'DENY',
                },
                {
                  name: 'form.security.xframe.sameorigin',
                  value: 'SAMEORIGIN',
                },
                {
                  name: 'form.security.xframe.allow-from',
                  value: 'ALLOW-FROM',
                },
              ]
            },
            {
              name: 'form.security.xssProtection',
              target: 'security.xssProtection',
              type: 'boolean',
              value: _.get(strapi.config, `environments.${env}.security.xssProtection`, null)
            }
          ]
        },
        {
          name: 'form.security.cors',
          items: [
            {
              name: 'form.security.cors.origin',
              target: 'security.cors.origin',
              type: 'string',
              value: _.get(strapi.config, `environments.${env}.security.cors.origin`, null)
            }
          ]
        }
      ]
    };
  },

  server: env => {
    return {
      name: 'form.server',
      description: 'form.server.description',
      sections: [
        {
          name: '',
          items: [
            {
              name: 'form.server.host',
              target: 'server.host',
              type: 'string',
              value: _.get(strapi.config, `environments.${env}.server.host`, null)
            },
            {
              name: 'form.server.port',
              target: 'server.port',
              type: 'number',
              value: _.get(strapi.config, `environments.${env}.server.port`, null)
            }
          ]
        }
      ]
    };
  },

  getEnvironments: () => {
    return _.map(_.keys(strapi.config.environments), environment => {
      return {
        name: environment,
        active: (strapi.config.environment === environment)
      }
    });
  },

  getItems: model => {
    let items = [];
    _.forEach(model.sections, section => items = _.concat(items, section.items));

    return items;
  },

  cleanParams: (params, items) => {
    const cleanParams = {};

    _.forEach(items, ({ target }) => _.has(params, target) ? _.set(cleanParams, target, _.get(params, target)) : '');

    return cleanParams;
  },

  paramsValidation: (params, items) => {
    let errors = [];

    const checkType = (input, { type, target }) => {
      if ((type === 'string' || type === 'text') && !_.isString(input)) errors.push({
        target: target,
        message: 'form.error.type.string'
      });

      if (type === 'number' && !_.isNumber(input)) errors.push({
        target: target,
        message: 'form.error.type.number'
      });

      if (type === 'boolean' && !_.isBoolean(input)) errors.push({
        target: target,
        message: 'form.error.type.boolean'
      });
    };

    const checkValidations = (input, item) => {
      _.forEach(item.validations, (value, key) => {
        if (key === 'required' && (_.isNull(input) || _.isEmpty(input) || _.isUndefined(input))) errors.push({
          target: item.target,
          message: 'form.error.validation.required'
        });

        if (key === 'regex' && !new RegExp(value).test(input)) errors.push({
          target: item.target,
          message: 'form.error.validation.regex'
        });

        if (key === 'max' && parseInt(input) > value) errors.push({
          target: item.target,
          message: 'form.error.validation.max'
        });

        if (key === 'min' && parseInt(input) < value) errors.push({
          target: item.target,
          message: 'form.error.validation.min'
        });

        if (key === 'maxLength' && input.length > value) errors.push({
          target: item.target,
          message: 'form.error.validation.maxLength'
        });

        if (key === 'minLength' && input.length  < value) errors.push({
          target: item.target,
          message: 'form.error.validation.minLength'
        });
      });
    };

    _.forEach(items, item => {
      if (_.has(params, item.target)) {
        const input = _.get(params, item.target, null);

        checkType(input, item)
        checkValidations(input, item)
      }
    });

    if (!_.isEmpty(errors)) {
      const grpTarget = _.groupBy(errors, 'target');

      errors = _.map(grpTarget, (errs, target) => {
        return {
          target,
          messages: _.map(errs, err => err.message)
        }
      });
    }

    return errors;
  },

  updateSettings: (params, items, env = '') => {
    const appPath = process.cwd();

    _.forEach(items, ({ target }) => {
      if (_.has(params, target)) {
        const input = _.get(params, target, null);
        const [file, ...objPath] = target.split('.');

        let filePath = (file === 'package') ? path.join(appPath, 'package.json') : path.join(appPath, 'config', 'environments', env, `${_.replace(file, '.', '/')}.json`);

        const fileContent = require(filePath);

        _.set(fileContent, objPath, input);

        fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
      }
    });
  }
};
