'use strict';

const execa = require('execa');
const _ = require('lodash');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  async getCurrentEnvironment(ctx) {
    try {
      const autoReload = strapi.config.autoReload;
      return ctx.send({ autoReload, currentEnvironment: strapi.app.env });
    } catch (err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async getStrapiVersion(ctx) {
    try {
      const strapiVersion = _.get(strapi.config, 'info.strapi', null);
      return ctx.send({ strapiVersion });
    } catch (err) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'The version is not available' }] },
      ]);
    }
  },

  async getGaConfig(ctx) {
    try {
      ctx.send({ uuid: _.get(strapi.config, 'uuid', false) });
    } catch (err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async getLayout(ctx) {
    try {
      const layout = require('../config/layout.js');

      return ctx.send({ layout });
    } catch (err) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'An error occurred' }] },
      ]);
    }
  },

  async installPlugin(ctx) {
    try {
      const { plugin } = ctx.request.body;
      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'install', plugin]);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async plugins(ctx) {
    try {
      const plugins = Object.keys(strapi.plugins).reduce((acc, key) => {
        acc[key] = _.get(strapi.plugins, [key, 'package', 'strapi'], {
          name: key,
        });

        return acc;
      }, {});

      ctx.send({ plugins });
    } catch (err) {
      strapi.log.error(err);
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async uninstallPlugin(ctx) {
    try {
      const { plugin } = ctx.params;
      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'uninstall', plugin, '-d']);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  /**
   * Create a/an admin record.
   *
   * @return {Object}
   */

  async create(ctx) {
    const values = ctx.request.body;

    if (!values.email) return ctx.badRequest('Missing email');
    if (!values.username) return ctx.badRequest('Missing username');
    if (!values.password) return ctx.badRequest('Missing password');

    const adminsWithSameEmail = await strapi
      .query('administrator', 'admin')
      .find({
        email: values.email,
      });

    const adminsWithSameUsername = await strapi
      .query('administrator', 'admin')
      .find({
        username: values.username,
      });

    if (adminsWithSameEmail.length > 0) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [
              {
                messages: [
                  { id: 'Auth.form.error.email.taken', field: ['email'] },
                ],
              },
            ]
          : 'Email is already taken.'
      );
    }

    if (adminsWithSameUsername.length > 0) {
      return ctx.badRequest(
        null,
        ctx.request.admin
          ? [
              {
                messages: [
                  {
                    id: 'Auth.form.error.username.taken',
                    field: ['username'],
                  },
                ],
              },
            ]
          : 'Username is already taken.'
      );
    }

    const user = {
      email: values.email,
      username: values.username,
      blocked: values.blocked === true ? true : false,
      password: await strapi.admin.services.auth.hashPassword(values.password),
    };

    const data = await strapi.query('administrator', 'admin').create(user);

    // Send 201 `created`
    ctx.created(strapi.admin.services.auth.sanitizeUser(data));
  },

  /**
   * Update a/an admin record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;
    const values = ctx.request.body;

    if (!values.email) return ctx.badRequest('Missing email');
    if (!values.username) return ctx.badRequest('Missing username');
    if (!values.password) return ctx.badRequest('Missing password');

    const admin = await strapi
      .query('administrator', 'admin')
      .findOne(ctx.params);

    // check the user exists
    if (!admin) return ctx.notFound('Administrator not found');

    // check there are not user with requested email
    if (values.email !== admin.email) {
      const adminsWithSameEmail = await strapi
        .query('administrator', 'admin')
        .findOne({
          email: values.email,
        });

      if (adminsWithSameEmail && adminsWithSameEmail.id !== admin.id) {
        return ctx.badRequest(
          null,
          ctx.request.admin
            ? [
                {
                  messages: [
                    { id: 'Auth.form.error.email.taken', field: ['email'] },
                  ],
                },
              ]
            : 'Email is already taken.'
        );
      }
    }

    // check there are not user with requested username
    if (values.username !== admin.username) {
      const adminsWithSameUsername = await strapi
        .query('administrator', 'admin')
        .findOne({
          username: values.username,
        });

      if (adminsWithSameUsername && adminsWithSameUsername.id !== admin.id) {
        return ctx.badRequest(
          null,
          ctx.request.admin
            ? [
                {
                  messages: [
                    {
                      id: 'Auth.form.error.username.taken',
                      field: ['username'],
                    },
                  ],
                },
              ]
            : 'Username is already taken.'
        );
      }
    }

    const user = {
      email: values.email,
      username: values.username,
      blocked: values.blocked === true ? true : false,
    };

    if (values.password !== admin.password) {
      user.password = await strapi.admin.services.auth.hashPassword(
        values.password
      );
    }

    const data = await strapi
      .query('administrator', 'admin')
      .update({ id }, user);

    // Send 200 `ok`
    ctx.send(data);
  },
};
