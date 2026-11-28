import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Core } from '@strapi/types';

/** A secret built at run time: a literal one would trip secret scanning. */
export const makeLegacySecret = () => randomBytes(32).toString('hex');

/**
 * A token the way Users & Permissions signed one in its default mode: `{ id }` with the numeric id,
 * HS256 unless told otherwise, one hour by default.
 */
export const signLegacyJwt = (
  secret: string,
  { id }: { id: number | string },
  options: { expiresIn?: string | number; algorithm?: jwt.Algorithm } = {}
) =>
  jwt.sign({ id }, secret, {
    algorithm: options.algorithm ?? 'HS256',
    expiresIn: options.expiresIn ?? '1h',
  } as jwt.SignOptions);

/**
 * A refresh session of Users & Permissions' refresh mode: the refresh token it handed out, the
 * access token minted from it, and the session's id. It lives on the `users-permissions` origin of
 * the session manager, which the instance defines while the compatibility mode is on. The tokens
 * are issued now, so they are from before a cutover recorded in the future.
 */
export const mintOldRefreshToken = async (
  strapi: Core.Strapi,
  userId: number,
  deviceId: string
): Promise<{ refreshToken: string; accessToken: string; sessionId: string }> => {
  const manager = strapi.sessionManager('users-permissions');
  const refresh = await manager.generateRefreshToken(String(userId), deviceId, { type: 'refresh' });
  const access = await manager.generateAccessToken(refresh.token);

  if ('error' in access) {
    throw new Error(`mintOldRefreshToken: ${access.error}`);
  }

  return { refreshToken: refresh.token, accessToken: access.token, sessionId: refresh.sessionId };
};
