import { describe, test, expect, vi } from 'vitest';
import { errors, z } from '@strapi/utils';

import formExtensionsService from '../form-extensions';

const saveRole = (data: Record<string, unknown>) => Promise.resolve({ id: 7, ...data });

describe('Form extensions service', () => {
  test('returns the core values as they are when no plugin added params', async () => {
    const formExtensions = formExtensionsService();
    const { data, save } = await formExtensions.prepare('role', {
      input: undefined,
      data: { name: 'Editor' },
    });

    expect(data).toEqual({ name: 'Editor' });
    await expect(save(() => saveRole(data))).resolves.toEqual({ id: 7, name: 'Editor' });
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
    ).rejects.toThrow('Invalid key plugins.spaces');
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
    const steps: string[] = [];
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
          // On update, the id the earlier steps got
          expect(entityId).toBe(3);
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

  test('keeps the details of a plugin ValidationError', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        validate() {
          throw new errors.ValidationError('This space is full', { code: 'SPACE_FULL' });
        },
      },
    });

    const error = await formExtensions
      .prepare('role', { input: undefined, data: {} })
      .catch((e) => e);

    expect(error.details).toEqual({
      code: 'SPACE_FULL',
      errors: [
        { path: ['plugins', 'spaces'], message: 'This space is full', name: 'ValidationError' },
      ],
    });
  });

  test('reports a refused plugins value with a path under plugins', async () => {
    const formExtensions = formExtensionsService();

    const notAnObject = await formExtensions
      .prepare('role', { input: 'spaces', data: {} })
      .catch((e) => e);
    const unknownKey = await formExtensions
      .prepare('role', { input: { other: {} }, data: {} })
      .catch((e) => e);

    expect(notAnObject.details.errors[0].path).toEqual(['plugins']);
    expect(unknownKey.details.errors[0].path).toEqual(['plugins', 'other']);
  });

  test('chains beforeSave steps and refuses one that returns no object', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('user', {
      spaces: { beforeSave: ({ data }) => ({ ...data, roles: [1] }) },
      teams: { beforeSave: ({ data }) => ({ ...data, firstname: `${data.firstname} (team)` }) },
    });

    const { data } = await formExtensions.prepare('user', {
      input: undefined,
      data: { firstname: 'Kai' },
    });

    expect(data).toEqual({ firstname: 'Kai (team)', roles: [1] });

    const broken = formExtensionsService();
    // @ts-expect-error - a plugin that forgot to return the core values
    broken.unstable_addInputParams('role', { spaces: { beforeSave: () => undefined } });

    await expect(broken.prepare('role', { input: undefined, data: {} })).rejects.toThrow(
      'the beforeSave step of "spaces" must return the core values as an object'
    );
  });

  test('gives afterSave the same entityId as the earlier steps on update, the saved id on create', async () => {
    const formExtensions = formExtensionsService();
    const ids: unknown[] = [];
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        validate(values, { entityId }) {
          ids.push(entityId);
        },
        afterSave({ entityId }) {
          ids.push(entityId);
        },
      },
    });

    const update = await formExtensions.prepare('role', {
      input: undefined,
      data: {},
      entityId: '7',
    });
    await update.save(() => saveRole({}));

    expect(ids).toEqual(['7', '7']);

    ids.length = 0;
    const create = await formExtensions.prepare('role', { input: undefined, data: {} });
    await create.save(() => saveRole({}));

    expect(ids).toEqual([undefined, 7]);
  });
});
