'use strict';

/**
 * Jwt.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const jwt = require('jsonwebtoken');

module.exports = ({ strapi }) => ({
  getToken(ctx) {
    let token;

    if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
      const parts = ctx.request.header.authorization.split(/\s+/);

      if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
        return null;
      }

      token = parts[1];
    } else {
      return null;
    }

    return this.verify(token);
  },

  issue(payload, jwtOptions = {}) {
    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');

    if (mode === 'refresh') {
      const userId = String(payload.id ?? payload.userId ?? '');
      if (!userId) {
        throw new Error('Cannot issue token: missing user id');
      }

      const issueRefreshToken = async () => {
        const refresh = await strapi
          .sessionManager('users-permissions')
          .generateRefreshToken(userId, undefined, { type: 'refresh' });

        const access = await strapi
          .sessionManager('users-permissions')
          .generateAccessToken(refresh.token);
        if ('error' in access) {
          throw new Error('Failed to generate access token');
        }

        return access.token;
      };

      return issueRefreshToken();
    }

    _.defaults(jwtOptions, strapi.config.get('plugin::users-permissions.jwt'));
    return jwt.sign(
      _.clone(payload.toJSON ? payload.toJSON() : payload),
      strapi.config.get('plugin::users-permissions.jwtSecret'),
      jwtOptions
    );
  },

  async verify(token) {
    const mode = strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');

    if (mode === 'refresh') {
      // Accept only access tokens minted by the SessionManager for UP
      const result = strapi.sessionManager('users-permissions').validateAccessToken(token);
      if (!result.isValid || result.payload.type !== 'access') {
        throw new Error('Invalid token.');
      }

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: Number(result.payload.userId) || result.payload.userId } });
      if (!user) {
        throw new Error('Invalid token.');
      }

      return { id: user.id };
    }

    return new Promise((resolve, reject) => {
      const jwtConfig = strapi.config.get('plugin::users-permissions.jwt', {});
      const algorithms = jwtConfig && jwtConfig.algorithm ? [jwtConfig.algorithm] : undefined;

      jwt.verify(
        token,
        strapi.config.get('plugin::users-permissions.jwtSecret'),
        algorithms ? { algorithms } : {},
        (err, tokenPayload = {}) => {
          if (err) {
            return reject(new Error('Invalid token.'));
          }
          resolve(tokenPayload);
        }
      );
    });
  },
});
