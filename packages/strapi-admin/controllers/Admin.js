'use strict';

const execa = require('execa');
const _ = require('lodash');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  getCurrentEnvironment: async ctx => {
    try {
      const autoReload = strapi.config.autoReload;
      return ctx.send({ autoReload, currentEnvironment: strapi.app.env });
    } catch (err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getStrapiVersion: async ctx => {
    try {
      const strapiVersion = _.get(strapi.config, 'info.strapi', null);
      return ctx.send({ strapiVersion });
    } catch (err) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'The version is not available' }] },
      ]);
    }
  },

  getGaConfig: async ctx => {
    try {
      ctx.send({ uuid: _.get(strapi.config, 'uuid', false) });
    } catch (err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getLayout: async ctx => {
    try {
      const layout = require('../config/layout.js');

      return ctx.send({ layout });
    } catch (err) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'An error occurred' }] },
      ]);
    }
  },

  installPlugin: async ctx => {
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

  plugins: async ctx => {
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

  uninstallPlugin: async ctx => {
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

    const adminQueries = strapi.admin.queries('administrator', 'admin');

    const adminsWithSameEmail = await adminQueries.find({
      email: values.email,
    });

    const adminsWithSameUsername = await adminQueries.find({
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

    const data = await adminQueries.create(user);

    // Send 201 `created`
    ctx.created(_.omit(data, ['password']));
  },

  /**
   * Update a/an admin record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const values = ctx.request.body;

    if (!values.email) return ctx.badRequest('Missing email');
    if (!values.username) return ctx.badRequest('Missing username');
    if (!values.password) return ctx.badRequest('Missing password');

    const adminQueries = strapi.admin.queries('administrator', 'admin');
    const { primaryKey } = adminQueries;

    const admin = await adminQueries.findOne(ctx.params);

    // check the user exists
    if (!admin) return ctx.notFound('Administrator not found');

    // check there are not user with requested email
    if (values.email !== admin.email) {
      const adminsWithSameEmail = await adminQueries.findOne({
        email: values.email,
      });

      if (
        adminsWithSameEmail &&
        adminsWithSameEmail[primaryKey] !== admin[primaryKey]
      ) {
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
      const adminsWithSameUsername = await adminQueries.findOne({
        username: values.username,
      });

      if (
        adminsWithSameUsername &&
        adminsWithSameUsername[primaryKey] !== admin[primaryKey]
      ) {
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

    const data = await adminQueries.update(ctx.params, values);

    // Send 200 `ok`
    ctx.send(data);
  },
};
