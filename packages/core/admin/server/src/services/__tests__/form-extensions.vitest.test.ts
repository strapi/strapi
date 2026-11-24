import { describe, test, expect, vi } from 'vitest';
import { errors, z } from '@strapi/utils';

import formExtensionsService from '../form-extensions';

const saveRole = (data: Record<string, unknown>) => Promise.resolve({ id: 7, ...data });

describe('Form extensions service', () => {
  test('returns the core values as they are when no plugin added params', async () => {
    const formExtensions = formExtensionsService();
    const { data, save } = await formExtensions.internal_prepare('role', {
      body: { name: 'Editor' },
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

    const error = await formExtensions.internal_prepare('role', { body: {} }).catch((e) => e);

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

    const teamsError = await teamsOnly.internal_prepare('role', { body: {} }).catch((e) => e);

    expect(teamsError.details.errors[0].path).toEqual(['plugins', 'teams', 'id']);
  });

  test('refuses values of a plugin that added no params to the form', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('user', { spaces: {} });

    await expect(
      formExtensions.internal_prepare('role', { body: { plugins: { spaces: {} } } })
    ).rejects.toThrow('Invalid key plugins.spaces');
  });

  test('checks the values with the schema and reports the path under plugins', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: { schema: (z) => z.object({ availableIn: z.array(z.string()).min(1) }) },
    });

    const error = await formExtensions
      .internal_prepare('role', { body: { plugins: { spaces: { availableIn: [] } } } })
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
        validate({ values, ...context }) {
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
          // The saved entity's id
          expect(entityId).toBe(7);
        },
      },
    });

    const { data, save } = await formExtensions.internal_prepare('user', {
      body: { roles: [] as number[], plugins: { spaces: { space: ' france ' } } },
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
    formExtensions.unstable_addInputParams('content-api-token', {
      spaces: {
        validate({ values }) {
          if (values === undefined) {
            throw new errors.ValidationError('A space is required');
          }
        },
      },
    });

    await expect(
      formExtensions.internal_prepare('content-api-token', { body: {} })
    ).rejects.toThrow('A space is required');
  });

  test('does not call afterSave when nothing was saved, and fails the save when it throws', async () => {
    const formExtensions = formExtensionsService();
    const afterSave = vi.fn().mockRejectedValue(new Error('Plugin save failed'));
    formExtensions.unstable_addInputParams('role', { spaces: { afterSave } });

    const { save } = await formExtensions.internal_prepare('role', { body: {} });

    await expect(save(() => Promise.resolve(null))).resolves.toBeNull();
    expect(afterSave).not.toHaveBeenCalled();

    await expect(save(() => saveRole({}))).rejects.toThrow(
      'the afterSave step of "spaces" failed after core saved entity 7'
    );
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

    const error = await formExtensions.internal_prepare('role', { body: {} }).catch((e) => e);

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
      .internal_prepare('role', { body: { plugins: 'spaces' } })
      .catch((e) => e);
    const unknownKey = await formExtensions
      .internal_prepare('role', { body: { plugins: { other: {} } } })
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

    const { data } = await formExtensions.internal_prepare('user', {
      body: { firstname: 'Kai' },
    });

    expect(data).toEqual({ firstname: 'Kai (team)', roles: [1] });

    const broken = formExtensionsService();
    // @ts-expect-error - a plugin that forgot to return the core values
    broken.unstable_addInputParams('role', { spaces: { beforeSave: () => undefined } });

    await expect(broken.internal_prepare('role', { body: {} })).rejects.toThrow(
      'the beforeSave step of "spaces" must return the core values as an object'
    );
  });

  test('gives every step the id the database matches: the route id as a number, the saved id on create', async () => {
    const formExtensions = formExtensionsService();
    const ids: unknown[] = [];
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        validate({ entityId }) {
          ids.push(entityId);
        },
        afterSave({ entityId }) {
          ids.push(entityId);
        },
      },
    });

    const update = await formExtensions.internal_prepare('role', {
      body: {},
      entityId: '07',
    });
    await update.save(() => saveRole({}));

    expect(ids).toEqual([7, 7]);

    ids.length = 0;
    const create = await formExtensions.internal_prepare('role', { body: {} });
    await create.save(() => saveRole({}));

    expect(ids).toEqual([undefined, 7]);
  });

  test('answers an afterSave ValidationError as a server error, the entity being saved', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        afterSave() {
          throw new errors.ValidationError('Too late to refuse');
        },
      },
    });

    const { save } = await formExtensions.internal_prepare('role', { body: {} });
    const error = await save(() => saveRole({})).catch((e) => e);

    expect(error).not.toBeInstanceOf(errors.ValidationError);
    expect(error.cause).toBeInstanceOf(errors.ValidationError);
  });

  test('checks plugin values with an async schema', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        schema: z.object({ space: z.string() }).refine(async ({ space }) => space !== 'full', {
          message: 'This space is full',
          path: ['space'],
        }),
      },
    });

    const error = await formExtensions
      .internal_prepare('role', { body: { plugins: { spaces: { space: 'full' } } } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error.details.errors[0].path).toEqual(['plugins', 'spaces', 'space']);
  });

  test('hands a body that is not an object to core as sent, without plugin steps', async () => {
    const formExtensions = formExtensionsService();
    const validate = vi.fn();
    formExtensions.unstable_addInputParams('role', { spaces: { validate } });

    const { data, save } = await formExtensions.internal_prepare('role', { body: [] });

    expect(data).toEqual([]);
    expect(validate).not.toHaveBeenCalled();
    await expect(save(() => saveRole({}))).resolves.toEqual({ id: 7 });
  });

  test('runs every afterSave when one fails, then answers one server error naming the failures', async () => {
    const formExtensions = formExtensionsService();
    const teamsAfterSave = vi.fn();
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        afterSave() {
          throw new Error('spaces failed');
        },
      },
      teams: { afterSave: teamsAfterSave },
      labels: {
        afterSave() {
          throw new Error('labels failed');
        },
      },
    });

    const { save } = await formExtensions.internal_prepare('role', { body: {} });
    const error = await save(() => saveRole({})).catch((e) => e);

    expect(teamsAfterSave).toHaveBeenCalled();
    expect(error.message).toBe(
      'formExtensions: the afterSave step of "spaces", "labels" failed after core saved entity 7'
    );
    expect(error.cause).toBeInstanceOf(AggregateError);
    expect(error.cause.errors.map((e: Error) => e.message)).toEqual([
      'spaces failed',
      'labels failed',
    ]);
  });

  test('refuses a validate step that returns a value instead of throwing', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      // @ts-expect-error - a plugin that returns false to refuse, as with yup's test()
      spaces: { validate: () => false },
    });

    await expect(formExtensions.internal_prepare('role', { body: {} })).rejects.toThrow(
      'the validate step of "spaces" returned a value'
    );
  });

  test('refuses a schema that is not a Zod schema when the param is added', () => {
    const formExtensions = formExtensionsService();

    expect(() =>
      formExtensions.unstable_addInputParams('role', {
        // @ts-expect-error - a yup schema
        spaces: { schema: { validate: () => true } },
      })
    ).toThrow('the schema of "spaces" must be a Zod schema');
  });

  test('passes route ids that are not small decimals as sent', async () => {
    const formExtensions = formExtensionsService();
    const ids: unknown[] = [];
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        validate({ entityId }) {
          ids.push(entityId);
        },
      },
    });

    for (const entityId of ['9007199254740993', '1e0', 'abc']) {
      await formExtensions.internal_prepare('role', { body: {}, entityId });
    }

    expect(ids).toEqual(['9007199254740993', '1e0', 'abc']);
  });
});
