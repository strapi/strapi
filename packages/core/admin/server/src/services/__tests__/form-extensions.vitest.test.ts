import { describe, test, expect, vi } from 'vitest';
import { errors } from '@strapi/utils';

import formExtensionsService from '../form-extensions';

const saveRole = (data: Record<string, unknown>) => Promise.resolve({ id: 7, ...data });

describe('Form extensions service', () => {
  test('saves the core values only when no plugin added params', async () => {
    const formExtensions = formExtensionsService();
    const save = vi.fn(saveRole);

    await expect(
      formExtensions.save('role', { input: undefined, data: { name: 'Editor' } }, save)
    ).resolves.toEqual({ id: 7, name: 'Editor' });
    expect(save).toHaveBeenCalledWith({ name: 'Editor' });
  });

  test('refuses values of a plugin that added no params to the form', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('user', { spaces: {} });
    const save = vi.fn(saveRole);

    await expect(
      formExtensions.save('role', { input: { spaces: {} }, data: {} }, save)
    ).rejects.toThrow(new errors.ValidationError('Invalid key plugins.spaces'));
    expect(save).not.toHaveBeenCalled();
  });

  test('checks the values with the schema and reports the path under plugins', async () => {
    const formExtensions = formExtensionsService();
    formExtensions.unstable_addInputParams('role', {
      spaces: { schema: (z) => z.object({ availableIn: z.array(z.string()).min(1) }) },
    });

    const error = await formExtensions
      .save('role', { input: { spaces: { availableIn: [] } }, data: {} }, saveRole)
      .catch((e) => e);

    expect(error).toBeInstanceOf(errors.ValidationError);
    expect(error.details.errors[0].path).toEqual(['plugins', 'spaces', 'availableIn']);
  });

  test('runs the steps in order with the parsed values and the context', async () => {
    const formExtensions = formExtensionsService();
    const steps: string[] = [];
    const user = { id: 1 } as never;

    formExtensions.unstable_addInputParams('user', {
      spaces: {
        schema: (z) => z.object({ space: z.string().trim() }),
        validate(values, context) {
          steps.push('validate');
          expect(values).toEqual({ space: 'france' });
          expect(context).toEqual({ user, entityId: 3 });
        },
        beforeSave({ data }) {
          steps.push('beforeSave');
          return { ...data, roles: [1, 2] };
        },
        afterSave({ values, entityId }) {
          steps.push('afterSave');
          expect(values).toEqual({ space: 'france' });
          expect(entityId).toBe(7);
        },
      },
    });

    const save = vi.fn((data: Record<string, unknown>) => {
      steps.push('save');
      return saveRole(data);
    });

    await formExtensions.save(
      'user',
      { input: { spaces: { space: ' france ' } }, data: { roles: [1] }, user, entityId: 3 },
      save
    );

    expect(save).toHaveBeenCalledWith({ roles: [1, 2] });
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
      formExtensions.save('api-token', { input: undefined, data: {} }, saveRole)
    ).rejects.toThrow('A space is required');
  });

  test('does not call afterSave when nothing was saved', async () => {
    const formExtensions = formExtensionsService();
    const afterSave = vi.fn();
    formExtensions.unstable_addInputParams('role', { spaces: { afterSave } });

    await expect(
      formExtensions.save('role', { input: undefined, data: {} }, () => Promise.resolve(null))
    ).resolves.toBeNull();
    expect(afterSave).not.toHaveBeenCalled();
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
