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
import { permission } from '../common-validators';

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
  afterEach(() => {
    delete (global as any).strapi;
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
