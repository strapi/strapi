import type { AuthenticationService } from '../auth';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const auth: AuthenticationService;
declare const info: Parameters<AuthenticationService['verify']>[0];

// With strict types, what `verify` resolves to depends on the strategy: it is `unknown`.
async function checkVerify() {
  const result = await auth.verify(info, { scope: ['api::article.article.find'] });
  // @ts-expect-error The result must be narrowed before use.
  result.credentials satisfies unknown;
  const checks: [Equal<typeof result, unknown>] = [true];
  checks satisfies unknown;
  await auth.verify(info, false);
}
checkVerify satisfies unknown;

// Strategies may resolve to anything.
auth.register('custom', {
  name: 'custom',
  authenticate: async () => ({ authenticated: true }),
  verify: async () => ({ anything: true }),
});
