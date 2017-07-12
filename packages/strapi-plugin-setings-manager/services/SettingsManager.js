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
            slug: 'advenced',
            name: 'menu.item.advenced',
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
    description: 'form.general.desc',
    sections: [
      {
        name: '',
        items: [
          {
            name: 'form.general.name',
            target: 'package.name',
            type: 'string',
            value: strapi.config.name,
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.description',
            target: 'package.description',
            type: 'string',
            value: strapi.config.description,
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.version',
            target: 'package.version',
            type: 'string',
            value: strapi.config.version,
            validations : {
              maxLength: 255,
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
      description: 'form.security.desc',
      sections: [
        {
          name: 'form.security.session',
          items: [
            {
              name: 'form.security.session.key',
              target: 'security.session.key',
              type: 'string',
              value: strapi.config.environments[env].security.session.key
            },
            {
              name: 'form.security.session.maxAge',
              target: 'security.session.maxAge',
              type: 'number',
              value: strapi.config.environments[env].security.session.maxAge
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
              value: strapi.config.environments[env].security.xframe,
              items: [
                {
                  name: 'server.xframe.deny',
                  value: 'DENY',
                },
                {
                  name: 'server.xframe.sameorigin',
                  value: 'SAMEORIGIN',
                },
                {
                  name: 'server.xframe.allow-from',
                  value: 'ALLOW-FROM',
                },
              ]
            },
            {
              name: 'form.security.xssProtection',
              target: 'security.xssProtection',
              type: 'boolean',
              value: strapi.config.environments[env].security.xssProtection
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
              value: strapi.config.environments[env].security.cors.origin,
            }
          ]
        }
      ]
    };
  },

  server: env => {
    return {
      name: 'form.server',
      description: 'form.server.desc',
      sections: [
        {
          name: '',
          items: [
            {
              name: 'form.server.host',
              target: 'server.host',
              type: 'string',
              value: strapi.config.environments[env].server.host
            },
            {
              name: 'form.server.port',
              target: 'server.port',
              type: 'number',
              value: strapi.config.environments[env].server.port
            }
          ]
        },
        {
          name: 'form.server.parser',
          items: [
            {
              name: 'form.server.parser.xframe',
              target: 'server.xframe',
              type: 'enum',
              value: strapi.config.environments[env].server.xframe,
              items: [
                {
                  name: 'server.xframe.deny',
                  value: 'DENY',
                },
                {
                  name: 'server.xframe.sameorigin',
                  value: 'SAMEORIGIN',
                },
                {
                  name: 'server.xframe.allow-from',
                  value: 'ALLOW-FROM',
                },
              ]
            },
            {
              name: 'form.server.xssProtection',
              target: 'server.xssProtection',
              type: 'boolean',
              value: strapi.config.environments[env].server.xssProtection
            }
          ]
        },
        {
          name: 'form.server.cors',
          items: [
            {
              name: 'form.server.cors.origin',
              target: 'server.cors.origin',
              type: 'string',
              value: strapi.config.environments[env].server.cors.origin
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
