/* eslint-env jest */

/**
 * Coverage for the `permission` yup schema's `action-validity` test.
 *
 * The lint-cleanup branch rewrote the check from `!!getActionFromProvider(actionId)` to an
 * explicit `action !== undefined && action !== null`. `actionProvider.get()` returns an action
 * object or `undefined`, so the two forms are equivalent for every value the provider can
 * actually produce — this suite locks that contract (object => valid, undefined => invalid,
 * nil action => deferred to `.required()`), which previously had NO unit coverage at all.
 *
 * The validator reads the global `strapi` (via `getService('permission')` =
 * `strapi.service('admin::permission')`). The shared unit setup (tests/setup/unit.setup.js)
 * rebuilds `strapi.service` to resolve `admin::x` from `strapi.admin.services[x]`, so we stub
 * the provider by assigning a `strapi` instance with that shape.
 */
import { yup } from '@strapi/utils';

import { permission, password } from '../common-validators';
import passwordPolicyService, { DEFAULT_PASSWORD_POLICY } from '../../services/password-policy';

type ProviderResult =
  | { actionId: string; subjects?: unknown; options?: unknown }
  | undefined
  | null;

const stubActionProvider = (get: (actionId: string) => ProviderResult) => {
  (global as any).strapi = {
    plugins: {},
    api: {},
    admin: {
      services: {
        permission: { actionProvider: { get } },
      },
    },
  };
};

const errorsOf = async (value: unknown): Promise<string[]> => {
  try {
    await permission.validate(value, { strict: true, abortEarly: false });
    return [];
  } catch (e: any) {
    return (e?.errors ?? []) as string[];
  }
};

describe('permission validation — action-validity', () => {
  let previousStrapi: unknown;

  beforeEach(() => {
    previousStrapi = (global as any).strapi;
  });

  afterEach(() => {
    // global.strapi is non-configurable (unit.setup.js); delete throws and the setter rejects undefined.
    if (previousStrapi !== undefined) {
      (global as any).strapi = previousStrapi;
    } else {
      (global as any).strapi = {
        plugins: {},
        api: {},
        admin: { services: {} },
      };
    }
  });

  test('accepts a permission whose action exists in the provider', async () => {
    stubActionProvider((actionId) => ({ actionId, subjects: null }));

    const errors = await errorsOf({ action: 'admin::marketplace.read' });

    expect(errors).toEqual([]);
  });

  test('rejects a permission whose action is unknown to the provider (get returns undefined)', async () => {
    stubActionProvider(() => undefined);

    const errors = await errorsOf({ action: 'admin::does.not.exist' });

    expect(errors).toContain('action is not an existing permission action');
  });

  test('rejects when the provider returns null (treated the same as undefined)', async () => {
    stubActionProvider(() => null);

    const errors = await errorsOf({ action: 'admin::marketplace.read' });

    expect(errors).toContain('action is not an existing permission action');
  });

  test('defers a nil action to the required check rather than reporting it as invalid', async () => {
    stubActionProvider(() => undefined);

    const errors = await errorsOf({});

    // `.required()` reports the missing action; `action-validity` short-circuits on nil,
    // so the "not an existing action" error must NOT be raised for an absent action.
    expect(errors).toContain('action is a required field');
    expect(errors).not.toContain('action is not an existing permission action');
  });
});

/**
 * The `password` validator reads the configurable policy through
 * `strapi.service('admin::password-policy')` at validation time, so a policy change applies to
 * the next request without a restart. The byte limit (bcrypt) is enforced whatever the policy.
 */
describe('password validation — password policy', () => {
  const stubPasswordPolicy = (policy: Partial<Record<string, unknown>> = {}) => {
    (global as any).strapi = {
      plugins: {},
      api: {},
      admin: {
        services: {
          'password-policy': {
            ...passwordPolicyService,
            getPolicy: jest.fn(async () => ({ ...DEFAULT_PASSWORD_POLICY, ...policy })),
          },
        },
      },
    };
  };

  const schema = yup.object().shape({ password: password.required() });

  const errorsOf = async (value: string): Promise<Array<{ path?: string; message: string }>> => {
    try {
      await schema.validate({ password: value }, { strict: true, abortEarly: false });
      return [];
    } catch (e: any) {
      return e.inner.map((error: any) => ({ path: error.path, message: error.message }));
    }
  };

  test('accepts a password satisfying the default policy', async () => {
    stubPasswordPolicy();

    expect(await errorsOf('Testing1234')).toEqual([]);
  });

  test('reports every broken rule of the default policy, one error per rule', async () => {
    stubPasswordPolicy();

    expect(await errorsOf('123')).toEqual([
      { path: 'password', message: 'password must be at least 8 characters' },
      { path: 'password', message: 'password must contain at least one lowercase character' },
      { path: 'password', message: 'password must contain at least one uppercase character' },
    ]);
  });

  test('follows the configured policy', async () => {
    stubPasswordPolicy({ minLength: 12, requireUppercase: false, requireSpecialCharacter: true });

    expect(await errorsOf('testing1234')).toEqual([
      { path: 'password', message: 'password must be at least 12 characters' },
      { path: 'password', message: 'password must contain at least one special character' },
    ]);
    expect(await errorsOf('testing-12345')).toEqual([]);
  });

  test('keeps rejecting passwords over 72 bytes whatever the policy says', async () => {
    stubPasswordPolicy({ minLength: 8 });

    expect(await errorsOf(`aA1${'b'.repeat(70)}`)).toEqual([
      { path: 'password', message: 'password must be less than 73 bytes' },
    ]);
  });
});
