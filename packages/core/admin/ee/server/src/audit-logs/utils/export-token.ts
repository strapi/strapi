import { createHmac, timingSafeEqual } from 'crypto';

const serializeExportClaims = (until: number, filters: unknown) =>
  `${until}:${JSON.stringify(filters ?? null)}`;

const signExportToken = (secret: string, until: number, filters: unknown) =>
  createHmac('sha256', secret).update(serializeExportClaims(until, filters)).digest('hex');

const verifyExportToken = (secret: string, token: unknown, until: number, filters: unknown) => {
  if (typeof token !== 'string' || token.length === 0) {
    return false;
  }

  const expected = Buffer.from(signExportToken(secret, until, filters));
  const provided = Buffer.from(token);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export { signExportToken, verifyExportToken };
