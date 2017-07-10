'use strict';

module.exports = {
  menu: {
    sections: [
      {
        tradKey: 'menu.section.global-settings',
        items: [
            {
            slug: 'general',
            tradKey: 'menu.item.general',
            icon: 'globe'
          },
          {
            slug: 'languages',
            tradKey: 'menu.item.languages',
            icon: 'language'
          },
          {
            slug: 'advenced',
            tradKey: 'menu.item.advenced',
            icon: 'cogs'
          }
        ]
      },
      {
        tradKey: 'menu.section.environments',
        items: [
          {
            slug: 'databases',
            tradKey: 'menu.item.databases',
            icon: 'databases'
          },
          {
            slug: 'security',
            tradKey: 'menu.item.security',
            icon: 'shield'
          },
          {
            slug: 'server',
            tradKey: 'menu.item.server',
            icon: 'server'
          }
        ]
      }
    ]
  },

  general: {
    tradKey: 'form.general',
    tradKeyDesc: 'form.general.desc',
    sections: [
      {
        tradKey: '',
        items: [
          {
            tradKey: 'form.general.name',
            target: 'package.name',
            type: 'string',
            value: strapi.config.name,
            validations : {
              maxLength: 255,
              required: true
            }
          },
          {
            tradKey: 'form.general.description',
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
      tradKey: 'form.security',
      tradKeyDesc: 'form.security.desc',
      sections: [
        {
          tradKey: 'form.security.session',
          items: [
            {
              tradKey: 'form.security.session.key',
              target: 'security.session.key',
              type: 'string',
              value: strapi.config.environments[env].security.session.key
            },
            {
              tradKey: 'form.security.session.maxAge',
              target: 'security.session.maxAge',
              type: 'number',
              value: strapi.config.environments[env].security.session.maxAge
            }
          ]
        },
        {
          tradKey: '',
          items: [
            {
              tradKey: 'form.security.xframe',
              target: 'security.xframe',
              type: 'enum',
              value: strapi.config.environments[env].security.xframe,
              items: [
                {
                  tradKey: 'server.xframe.deny',
                  value: 'DENY',
                },
                {
                  tradKey: 'server.xframe.sameorigin',
                  value: 'SAMEORIGIN',
                },
                {
                  tradKey: 'server.xframe.allow-from',
                  value: 'ALLOW-FROM',
                },
              ]
            },
            {
              tradKey: 'form.security.xssProtection',
              target: 'security.xssProtection',
              type: 'boolean',
              value: strapi.config.environments[env].security.xssProtection
            }
          ]
        },
        {
          tradKey: 'form.security.cors',
          items: [
            {
              tradKey: 'form.security.cors.origin',
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
      tradKey: 'form.server',
      tradKeyDesc: 'form.server.desc',
      sections: [
        {
          tradKey: '',
          items: [
            {
              tradKey: 'form.server.host',
              target: 'server.host',
              type: 'string',
              value: strapi.config.environments[env].server.host
            },
            {
              tradKey: 'form.server.port',
              target: 'server.port',
              type: 'number',
              value: strapi.config.environments[env].server.port
            }
          ]
        },
        {
          tradKey: 'form.server.parser',
          items: [
            {
              tradKey: 'form.server.parser.xframe',
              target: 'server.xframe',
              type: 'enum',
              value: strapi.config.environments[env].server.xframe,
              items: [
                {
                  tradKey: 'server.xframe.deny',
                  value: 'DENY',
                },
                {
                  tradKey: 'server.xframe.sameorigin',
                  value: 'SAMEORIGIN',
                },
                {
                  tradKey: 'server.xframe.allow-from',
                  value: 'ALLOW-FROM',
                },
              ]
            },
            {
              tradKey: 'form.server.xssProtection',
              target: 'server.xssProtection',
              type: 'boolean',
              value: strapi.config.environments[env].server.xssProtection
            }
          ]
        },
        {
          tradKey: 'form.server.cors',
          items: [
            {
              tradKey: 'form.server.cors.origin',
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
