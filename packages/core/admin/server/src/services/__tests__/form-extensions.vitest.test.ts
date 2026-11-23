import { describe, test, expect, vi, beforeEach } from 'vitest';
import { errors, z } from '@strapi/utils';

import formExtensionsService from '../form-extensions';

const saveRole = (data: Record<string, unknown>) => Promise.resolve({ id: 7, ...data });

describe('Form extensions service', () => {
  const steps: string[] = [];

  beforeEach(() => {
    steps.length = 0;

    global.strapi = {
      db: {
        async transaction(callback: () => Promise<unknown>) {
          steps.push('transaction');
          return callback();
        },
      },
    } as any;
  });

  test('returns the core values as they are when no plugin added params', async () => {
    const formExtensions = formExtensionsService();
    const { data, save } = await formExtensions.prepare('role', {
      input: undefined,
      data: { name: 'Editor' },
    });

    expect(data).toEqual({ name: 'Editor' });
    await expect(save(() => saveRole(data))).resolves.toEqual({ id: 7, name: 'Editor' });
  });

  test('does not wrap the save in a transaction, so core keeps its deadlock retry', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', { spaces: { afterSave: vi.fn() } });

    const { save } = await formExtensions.prepare('role', { input: undefined, data: {} });
    await save(() => saveRole({}));

    expect(steps).toEqual([]);
  });

  test('reports a plugin ValidationError without field errors at plugins.<pluginId>', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        validate() {
          throw new errors.ValidationError('This space is not allowed');
        },
      },
    });

    const error = await formExtensions
      .prepare('role', { input: undefined, data: {} })
      .catch((e) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error.message).toBe('This space is not allowed');
    expect(error.details.errors).toEqual([
      {
        path: ['plugins', 'spaces'],
        message: 'This space is not allowed',
        name: 'ValidationError',
      },
    ]);

    // Field errors a plugin sets itself are kept as they are
    const teamsOnly = formExtensionsService();
    teamsOnly.unstable_addInputParams('role', {
      teams: {
        validate() {
          throw new errors.ValidationError('Invalid team', {
            errors: [{ path: ['plugins', 'teams', 'id'], message: 'Invalid team' }],
          });
        },
      },
    });

    const teamsError = await teamsOnly
      .prepare('role', { input: undefined, data: {} })
      .catch((e) => e);

    expect(teamsError.details.errors[0].path).toEqual(['plugins', 'teams', 'id']);
  });

  test('refuses values of a plugin that added no params to the form', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('user', { spaces: {} });

    await expect(
      formExtensions.prepare('role', { input: { spaces: {} }, data: {} })
    ).rejects.toThrow(new errors.ValidationError('Invalid key plugins.spaces'));
  });

  test('checks the values with the schema and reports the path under plugins', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: { schema: (z) => z.object({ availableIn: z.array(z.string()).min(1) }) },
    });

    const error = await formExtensions
      .prepare('role', { input: { spaces: { availableIn: [] } }, data: {} })
      .catch((e) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error.details.errors[0].path).toEqual(['plugins', 'spaces', 'availableIn']);
  });

  test('runs the plugin steps before core, then saves and runs afterSave', async () => {
    const formExtensions = formExtensionsService();
    const user = { id: 1 } as never;

    formExtensions.unstable_addInputParams('user', {
      spaces: {
        schema: z.object({ space: z.string().trim() }),
        validate(values, context) {
          steps.push('validate');
          // The values have the type the schema returns
          expect(values?.space).toBe('france');
          expect(context).toEqual({ user, entityId: 3 });
        },
        beforeSave({ data }) {
          steps.push('beforeSave');
          return { ...data, roles: [1, 2] };
        },
        afterSave({ values, entityId }) {
          steps.push('afterSave');
          expect(values?.space).toBe('france');
          expect(entityId).toBe(7);
        },
      },
    });

    const { data, save } = await formExtensions.prepare('user', {
      input: { spaces: { space: ' france ' } },
      data: { roles: [] as number[] },
      user,
      entityId: 3,
    });

    // Core checks what the plugins return, here roles the plugin merged in
    expect(data).toEqual({ roles: [1, 2] });

    await save(() => {
      steps.push('save');
      return saveRole(data);
    });

    expect(steps).toEqual(['validate', 'beforeSave', 'save', 'afterSave']);
  });

  test('runs a plugin check also when the body has none of its values', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('api-token', {
      spaces: {
        validate(values) {
          if (values === undefined) {
            throw new errors.ValidationError('A space is required');
          }
        },
      },
    });

    await expect(
      formExtensions.prepare('api-token', { input: undefined, data: {} })
    ).rejects.toThrow('A space is required');
  });

  test('does not call afterSave when nothing was saved, and fails the save when it throws', async () => {
    const formExtensions = formExtensionsService();
    const afterSave = vi.fn().mockRejectedValue(new Error('Plugin save failed'));
    formExtensions.unstable_addInputParams('role', { spaces: { afterSave } });

    const { save } = await formExtensions.prepare('role', { input: undefined, data: {} });

    await expect(save(() => Promise.resolve(null))).resolves.toBeNull();
    expect(afterSave).not.toHaveBeenCalled();

    await expect(save(() => saveRole({}))).rejects.toThrow('Plugin save failed');
  });

  test('refuses an unknown form and a param added twice', () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', { spaces: {} });

    expect(() =>
      // @ts-expect-error - not a form plugins can extend
      formExtensions.unstable_addInputParams('webhook', { spaces: {} })
    ).toThrow('"webhook" is not a form plugins can extend');
    expect(() => formExtensions.unstable_addInputParams('role', { spaces: {} })).toThrow(
      'param "spaces" has already been added to the role form'
    );
  });
});
