import { createHmac, timingSafeEqual } from 'crypto';

const EXPORT_TOKEN_TTL_MS = 60 * 60 * 1000;
const EXPORT_TOKEN_CLOCK_SKEW_MS = 60 * 1000;

const serializeExportClaims = (until: number, issuedAt: number, filters: unknown) =>
  `${until}:${issuedAt}:${JSON.stringify(filters ?? null)}`;

const computeSignature = (secret: string, until: number, issuedAt: number, filters: unknown) =>
  createHmac('sha256', secret)
    .update(serializeExportClaims(until, issuedAt, filters))
    .digest('hex');

const signExportToken = (
  secret: string,
  until: number,
  filters: unknown,
  issuedAt = Date.now()
): string => `${issuedAt}.${computeSignature(secret, until, issuedAt, filters)}`;

const verifyExportToken = (
  secret: string,
  token: unknown,
  until: number,
  filters: unknown,
  now = Date.now()
): boolean => {
  if (typeof token !== 'string' || token.length === 0) {
    return false;
  }

  const separator = token.indexOf('.');
  if (separator <= 0) {
    return false;
  }

  const issuedAt = Number(token.slice(0, separator));
  if (!Number.isInteger(issuedAt)) {
    return false;
  }

  const expected = Buffer.from(computeSignature(secret, until, issuedAt, filters));
  const provided = Buffer.from(token.slice(separator + 1));

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  const age = now - issuedAt;

  return age >= -EXPORT_TOKEN_CLOCK_SKEW_MS && age <= EXPORT_TOKEN_TTL_MS;
};

export { signExportToken, verifyExportToken, EXPORT_TOKEN_TTL_MS };
