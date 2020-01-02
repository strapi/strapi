const _ = require('lodash');

module.exports = async (ctx, next) => {
  let roles = [];

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id, isAdmin = false } = await strapi.plugins[
        'users-permissions'
      ].services.jwt.getToken(ctx);

      if (id === undefined) {
        throw new Error('Invalid token: Token did not contain required fields');
      }

      if (isAdmin) {
        ctx.state.admin = await strapi
          .query('administrator', 'admin')
          .findOne({ id }, []);
      } else {
        ctx.state.user = await strapi
          .query('user', 'users-permissions')
          .findOne({ id }, ['role']);
      }
    } catch (err) {
      strapi.log.error(err);
      return handleErrors(ctx, err, 'unauthorized');
    }

    if (ctx.state.admin) {
      if (ctx.state.admin.blocked === true) {
        return handleErrors(
          ctx,
          'Your account has been blocked by the administrator.',
          'unauthorized'
        );
      }

      ctx.state.user = ctx.state.admin;
      return await next();
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, 'User Not Found', 'unauthorized');
    }

    if (Array.isArray(ctx.state.user.role)) {
      roles = ctx.state.user.role;
    } else {
      roles = ctx.state.user.role ? [ctx.state.user.role] : [];
    }

    if (roles.some(r => r.type === 'root')) {
      return await next();
    }

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    if (
      _.get(await store.get({ key: 'advanced' }), 'email_confirmation') &&
      !ctx.state.user.confirmed
    ) {
      return handleErrors(
        ctx,
        'Your account email is not confirmed.',
        'unauthorized'
      );
    }

    if (ctx.state.user.blocked) {
      return handleErrors(
        ctx,
        'Your account has been blocked by the administrator.',
        'unauthorized'
      );
    }
  }

  // Retrieve `public` role.
  if (!roles.length) {
    roles = await strapi
      .query('role', 'users-permissions')
      .find({ type: 'public' }, []);
  }

  const route = ctx.request.route;
  const permissions = await strapi
    .query('permission', 'users-permissions')
    .find(
      {
        role_in: roles.map(r => r.id),
        type: route.plugin || 'application',
        controller: route.controller,
        action: route.action,
        enabled: true,
      },
      []
    );

  if (!permissions.length) {
    return handleErrors(ctx, undefined, 'forbidden');
  }

  // Execute the policies.
  const { policy } = permissions.find(p => p.policy) || {};
  if (policy) {
    return await strapi.plugins['users-permissions'].config.policies[policy](
      ctx,
      next
    );
  }

  // Execute the action.
  await next();
};

const handleErrors = (ctx, err = undefined, type) => {
  if (ctx.request.graphql === null) {
    return (ctx.request.graphql = strapi.errors[type](err));
  }

  return ctx[type](err);
};
