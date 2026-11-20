import type { SessionManagerService, SessionOriginConfig } from '../session-manager';
import type { Admin } from '../../core/config/admin';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const sessionManager: SessionManagerService;

// With strict types, `defineOrigin` takes the origin config that `@strapi/core` stores
// (`SessionManagerConfig` in `services/session-manager.ts`). Without strict types it stays `any`
// (`tests/strict-off/session-manager.ts`).
type DefineOriginConfig = Parameters<SessionManagerService['defineOrigin']>[1];
declare const defineOriginChecks: [Expect<Equal<DefineOriginConfig, SessionOriginConfig>>];
defineOriginChecks satisfies unknown;

// The `jsonwebtoken` algorithms (`Algorithm` in `@types/jsonwebtoken`).
declare const algorithmChecks: [
  Expect<
    Equal<
      SessionOriginConfig['algorithm'],
      | 'HS256'
      | 'HS384'
      | 'HS512'
      | 'RS256'
      | 'RS384'
      | 'RS512'
      | 'ES256'
      | 'ES384'
      | 'ES512'
      | 'PS256'
      | 'PS384'
      | 'PS512'
      | 'none'
      | undefined
    >
  >,
];
algorithmChecks satisfies unknown;

const lifespans = {
  accessTokenLifespan: 30 * 60,
  maxRefreshTokenLifespan: 30 * 24 * 60 * 60,
  idleRefreshTokenLifespan: 14 * 24 * 60 * 60,
  maxSessionLifespan: 24 * 60 * 60,
  idleSessionLifespan: 2 * 60 * 60,
};

sessionManager.defineOrigin('admin', lifespans);
sessionManager.defineOrigin('admin', {
  ...lifespans,
  jwtSecret: 'secret',
  algorithm: 'RS256',
  jwtOptions: { privateKey: 'private', publicKey: 'public' },
});

// @ts-expect-error Lifespans are in seconds, not `ms` strings.
sessionManager.defineOrigin('x', { ...lifespans, accessTokenLifespan: '1h' });
// @ts-expect-error `jsonwebtoken` has no such algorithm.
sessionManager.defineOrigin('x', { ...lifespans, algorithm: 'HS1024' });
// @ts-expect-error Every lifespan is required.
sessionManager.defineOrigin('x', { accessTokenLifespan: 30 * 60 });

// The admin origin takes its algorithm from `admin.auth.sessions.options` or the legacy
// `admin.auth.options` (`getTokenOptions` in `@strapi/admin`), and `jsonwebtoken` rejects any other
// value when it signs a token (`jsonwebtoken/sign.js`), so both configs accept its algorithms only.
type AuthOptions = NonNullable<Admin['auth']['options']>;
type AuthSessionsOptions = NonNullable<NonNullable<Admin['auth']['sessions']>['options']>;
declare const adminAlgorithmChecks: [
  Expect<Equal<AuthOptions['algorithm'], SessionOriginConfig['algorithm']>>,
  Expect<Equal<AuthSessionsOptions['algorithm'], SessionOriginConfig['algorithm']>>,
  Expect<Equal<AuthOptions['expiresIn'], string | number | undefined>>,
  Expect<Equal<AuthOptions['issuer'], unknown>>,
];
adminAlgorithmChecks satisfies unknown;

const sessionsOptions: AuthSessionsOptions = { algorithm: 'RS256', privateKey: 'private' };
const legacyOptions: AuthOptions = { algorithm: 'HS512', expiresIn: '30d' };
sessionsOptions satisfies unknown;
legacyOptions satisfies unknown;
// @ts-expect-error `jsonwebtoken` has no such algorithm.
const unknownSessionsAlgorithm: AuthSessionsOptions = { algorithm: 'HS1024' };
// @ts-expect-error `jsonwebtoken` has no such algorithm.
const unknownLegacyAlgorithm: AuthOptions = { algorithm: 'HS1024' };
unknownSessionsAlgorithm satisfies unknown;
unknownLegacyAlgorithm satisfies unknown;
