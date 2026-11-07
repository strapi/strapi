import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

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
