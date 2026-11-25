/**
 * Compile-only checks of the arguments the typed engine hooks take, run by
 * `engine-hooks.types.vitest.test.ts` twice: with `strict: true`, and with the server preset of
 * `@strapi/typescript-utils` (`strict: false`, so without `strictNullChecks`).
 */
import type { engine } from '../../../index';

declare const hooks: engine.TypedPermissionEngineHooks;

export const requiredContext = async () => {
  // @ts-expect-error the context is required
  await hooks['before-format::validate.permission'].call();
  // @ts-expect-error the permission is required
  await hooks['format.permission'].call();
  // @ts-expect-error the context is required
  await hooks['after-format::validate.permission'].call();
  // @ts-expect-error the context is required
  await hooks['before-evaluate.permission'].call();
  // @ts-expect-error the context is required
  await hooks['before-register.permission'].call();
};
