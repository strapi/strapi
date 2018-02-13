'use strict';

/**
 * Auth.js controller
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

const _ = require('lodash');
const crypto = require('crypto');
const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

module.exports = {
  callback: async (ctx) => {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions'
    });

    if (provider === 'local') {
      if (!_.get(await store.get({key: 'grant'}), 'email.enabled') && !ctx.request.admin) {
        return ctx.badRequest(null, 'This provider is disabled.');
      }

      // The identifier is required.
      if (!params.identifier) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.provide' }] }] : 'Please provide your username or your e-mail.');
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }] : 'Please provide your password.');
      }

      const query = {};

      // Check if the provided identifier is an email or not.
      const isEmail = emailRegExp.test(params.identifier);

      // Set the identifier to the appropriate query field.
      if (isEmail) {
        query.email = params.identifier.toLowerCase();
      } else {
        query.username = params.identifier;
      }

      // Check if the user exists.
      const user = await strapi.query('user', 'users-permissions').findOne(query, ['role']);

      if (!user) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }] : 'Identifier or password invalid.');
      }

      if (user.role.type !== 'root' && ctx.request.admin) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.noAdminAccess' }] }] : `You're not an administrator.`);
      }

      // The user never registered with the `local` provider.
      if (!user.password) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.local' }] }] : 'This user never set a local password, please login thanks to the provider used during account creation.');
      }

      const validPassword = strapi.plugins['users-permissions'].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.invalid' }] }] : 'Identifier or password invalid.');
      } else {
        ctx.send({
          jwt: strapi.plugins['users-permissions'].services.jwt.issue(_.pick(user.toJSON ? user.toJSON() : user, ['_id', 'id'])),
          user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
        });
      }
    } else {
      if (!_.get(await store.get({key: 'grant'}), [provider, 'enabled'])) {
        return ctx.badRequest(null, 'This provider is disabled.');
      }

      // Connect the user thanks to the third-party provider.
      let user, error;
      try {
        [user, error] = await strapi.plugins['users-permissions'].services.providers.connect(provider, ctx.query);
      } catch([user, error]) {
        return ctx.badRequest(null, (error === 'array') ? (ctx.request.admin ? error[0] : error[1]) : error);
      }

      if (!user) {
        return ctx.badRequest(null, (error === 'array') ? (ctx.request.admin ? error[0] : error[1]) : error);
      }

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(_.pick(user, ['_id', 'id'])),
        user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
      });
    }
  },

  changePassword: async (ctx) => {
    const params = _.assign({}, ctx.request.body, ctx.params);

    if (params.password && params.passwordConfirmation && params.password === params.passwordConfirmation && params.code) {
      const user = await strapi.query('user', 'users-permissions').findOne({ resetPasswordToken: params.code });

      if (!user) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.code.provide' }] }] : 'Incorrect code provided.');
      }

      // Delete the current code
      user.resetPasswordToken = null;

      user.password =  await strapi.plugins['users-permissions'].services.user.hashPassword(params);

      // Update the user.
      await strapi.query('user', 'users-permissions').update(user);

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(_.pick(user.toJSON ? user.toJSON() : user, ['_id', 'id'])),
        user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
      });
    } else if (params.password && params.passwordConfirmation && params.password !== params.passwordConfirmation) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.matching' }] }] : 'Passwords do not match.');
    } else {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.params.provide' }] }] : 'Incorrect params provided.');
    }
  },

  connect: async (ctx, next) => {
    const grantConfig = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'grant'
    }).get();

    _.defaultsDeep(grantConfig, {
      server: {
        protocol: 'http',
        host: `${strapi.config.currentEnvironment.server.host}:${strapi.config.currentEnvironment.server.port}`
      }
    });

    const provider = ctx.request.url.split('/')[2];
    const config = grantConfig[provider];

    if (!_.get(config, 'enabled')) {
      return ctx.badRequest(null, 'This provider is disabled.');
    }

    const Grant = require('grant-koa');
    const grant = new Grant(grantConfig);

    return strapi.koaMiddlewares.compose(grant.middleware)(ctx, next);
  },

  forgotPassword: async (ctx) => {
    const { email, url } = ctx.request.body;

    // Find the user user thanks to his email.
    const user = await strapi.query('user', 'users-permissions').findOne({ email });

    // User not found.
    if (!user) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.user.not-exist' }] }] : 'This email does not exist.');
    }

    // Generate random token.
    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    // Set the property code.
    user.resetPasswordToken = resetPasswordToken;

    const settings = (await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions'
    }).get({ key: 'email' }))['reset_password'].options;

    settings.message = await strapi.plugins['users-permissions'].services.userspermissions.template(settings.message, {
      URL: url,
      USER: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken', 'role', 'provider']),
      TOKEN: resetPasswordToken
    });

    settings.object = await strapi.plugins['users-permissions'].services.userspermissions.template(settings.object, {
      USER: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken', 'role', 'provider'])
    });

    try {
      // Send an email to the user.
      await strapi.plugins['email'].services.email.send({
        to: user.email,
        from: (settings.from.email || settings.from.name) ? `"${settings.from.name}" <${settings.from.email}>` : undefined,
        replyTo: settings.response_email,
        subject: settings.object,
        text: settings.message,
        html: settings.message
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }

    // Update the user.
    await strapi.query('user', 'users-permissions').update(user);

    ctx.send({ ok: true });
  },

  register: async (ctx) => {
    if (!(await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
      key: 'advanced'
    }).get()).allow_register) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.advanced.allow_register' }] }] : 'Register action is currently disabled.');
    }

    const params = _.assign(ctx.request.body, {
      provider: 'local'
    });

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.provide' }] }] : 'Please provide your password.');
    }

    // Throw an error if the password selected by the user
    // contains more than two times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.password.format' }] }] : 'Your password cannot contain more than three times the symbol `$`.');
    }

    // Retrieve root role.
    const root = await strapi.query('role', 'users-permissions').findOne({ type: 'root' }, ['users']);

    // First, check if the user is the first one to register as admin.
    const hasAdmin = root.users.length > 0;

    // Check if the user is the first to register
    const role = hasAdmin === false ? root : await strapi.query('role', 'users-permissions').findOne({ type: 'guest' }, []);

    if (!role) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.role.notFound' }] }] : 'Impossible to find the root role.');
    }

    // Check if the provided identifier is an email or not.
    const isEmail = emailRegExp.test(params.identifier);

    if (isEmail) {
      params.identifier = params.identifier.toLowerCase();
    }

    params.role = role._id || role.id;
    params.password = await strapi.plugins['users-permissions'].services.user.hashPassword(params);

    const user = await strapi.query('user', 'users-permissions').findOne({
      email: params.email
    });

    if (user && user.provider === params.provider) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.taken' }] }] : 'Email is already taken.');
    }

    if (user && user.provider !== params.provider && strapi.plugins['users-permissions'].config.advanced.unique_email) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Auth.form.error.email.taken' }] }] : 'Email is already taken.');
    }

    try {
      const user = await strapi.query('user', 'users-permissions').create(params);

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue(_.pick(user.toJSON ? user.toJSON() : user, ['_id', 'id'])),
        user: _.omit(user.toJSON ? user.toJSON() : user, ['password', 'resetPasswordToken'])
      });
    } catch(err) {
      const adminError = _.includes(err.message, 'username') ? 'Auth.form.error.username.taken' : 'Auth.form.error.email.taken';

      ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: adminError }] }] : err.message);
    }
  }
};
