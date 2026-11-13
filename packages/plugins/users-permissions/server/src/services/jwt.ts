import type { Context } from 'koa';
import type { Data } from '@strapi/types';

import _ from 'lodash';
import jwt from 'jsonwebtoken';
import type { PluginContext } from '../types';

type TokenPayload = jwt.JwtPayload & {
  id?: Data.ID;
  userId?: Data.ID;
  sessionId?: string;
  toJSON?: () => object;
};

/** Issue and verify Content API tokens in legacy or session mode. */
export default ({ strapi }: PluginContext) => ({
  getToken(ctx: Pick<Context, 'request'>) {
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

  issue(payload: TokenPayload, jwtOptions: jwt.SignOptions = {}) {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );

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
      strapi.config.get<string>('plugin::users-permissions.jwtSecret'),
      jwtOptions
    );
  },

  async verify(token: string): Promise<TokenPayload> {
    const mode = strapi.config.get<string>(
      'plugin::users-permissions.jwtManagement',
      'legacy-support'
    );

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

      // Surface the sessionId so the strategy can flag the "current" session.
      return { id: user.id, sessionId: result.payload.sessionId };
    }

    return new Promise((resolve, reject) => {
      const jwtConfig = strapi.config.get<jwt.SignOptions>('plugin::users-permissions.jwt', {});
      const algorithms: jwt.Algorithm[] = [jwtConfig?.algorithm || 'HS256'];

      jwt.verify(
        token,
        strapi.config.get<string>('plugin::users-permissions.jwtSecret'),
        { algorithms },
        (err, tokenPayload = {}) => {
          if (err) {
            return reject(new Error('Invalid token.'));
          }
          if (typeof tokenPayload !== 'object') return reject(new Error('Invalid token.'));
          resolve(tokenPayload);
        }
      );
    });
  },
});
