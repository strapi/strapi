'use strict';

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
            target: 'package.name',
            type: 'string',
            value: strapi.config.description,
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            name: 'form.general.version',
            target: 'package.name',
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
  }
};
