import { describe, expect, it } from 'vitest';

import { validateConditionPreview } from '../condition';
import { validateProfileBody } from '../me';
import { validateResolved } from '../migration';
import { validateRoutesSubject } from '../permission-layout';
import { validateHasAnyAdminPermissionConfig } from '../policies';
import { validateRoleBody } from '../role';

/** What a client reads: the error's name and message, which the routes' answers carry unchanged. */
const refusal = async (run: () => unknown) => {
  try {
    await run();
  } catch (error) {
    const { name, message } = error as Error;

    return { name, message };
  }

  return undefined;
};

describe('input validation', () => {
  describe('a role body', () => {
    it('is any object, a class instance included', async () => {
      await expect(validateRoleBody({ name: 'Editors' })).resolves.toEqual({ name: 'Editors' });
      await expect(validateRoleBody({})).resolves.toEqual({});
    });

    it.each([undefined, null, [], 'x', 1])('refuses %j as a ValidationError', async (body) => {
      expect(await refusal(() => validateRoleBody(body))).toEqual({
        name: 'ValidationError',
        message: 'A role is an object',
      });
    });
  });

  describe('a condition preview', () => {
    const valid = { condition: {}, subject: 'api::a.a', userDocumentId: 'abc' };

    it('passes with the inputs left out', async () => {
      await expect(validateConditionPreview(valid)).resolves.toEqual(valid);
    });

    it('names the first thing wrong, in the order the checks are listed', async () => {
      const message = async (body: unknown) =>
        (await refusal(() => validateConditionPreview(body)))?.message;

      expect(await message(undefined)).toBe(
        'A preview is an object: { condition, subject, userDocumentId, inputs }'
      );
      expect(await message({ subject: 1, userDocumentId: 1, inputs: 1 })).toBe(
        'subject is the uid of a content type'
      );
      expect(await message({ subject: '', userDocumentId: 1, inputs: 1 })).toBe(
        'subject is the uid of a content type'
      );
      expect(await message({ ...valid, userDocumentId: '', inputs: 1 })).toBe(
        'userDocumentId is the documentId of an end user'
      );
      expect(await message({ ...valid, inputs: null })).toBe(
        'inputs is an object: the value of each input'
      );
      expect(await message({ ...valid, inputs: [] })).toBe(
        'inputs is an object: the value of each input'
      );
    });
  });

  it('refuses a profile body with no data object, with the message the route has always given', async () => {
    for (const body of [undefined, null, {}, { data: 'x' }, { data: [] }, []]) {
      expect(await refusal(() => validateProfileBody(body)), JSON.stringify(body)).toEqual({
        name: 'ValidationError',
        message: 'Missing "data" payload in the request body',
      });
    }

    await expect(validateProfileBody({ data: { a: 1 } })).resolves.toEqual({ data: { a: 1 } });
  });

  it('refuses a resolved that is not a boolean', async () => {
    for (const value of [undefined, null, 'true', 1]) {
      expect(await refusal(() => validateResolved(value))).toEqual({
        name: 'ValidationError',
        message: 'resolved must be true or false',
      });
    }

    await expect(validateResolved(false)).resolves.toBe(false);
  });

  it('refuses a routes subject that is not one string', async () => {
    for (const value of [undefined, ['a', 'b'], 1]) {
      expect(await refusal(() => validateRoutesSubject(value))).toEqual({
        name: 'ValidationError',
        message: 'subject is one string: a content type uid or a route group id',
      });
    }

    await expect(validateRoutesSubject('api::a.a')).resolves.toBe('api::a.a');
  });

  it('refuses a policy config with no list of actions', () => {
    expect(() => validateHasAnyAdminPermissionConfig({ actions: ['a.b.c'] })).not.toThrow();

    for (const bad of [
      undefined,
      {},
      { actions: [] },
      { actions: 'a.b.c' },
      { actions: [1] },
      { actions: [''] },
    ]) {
      expect(() => validateHasAnyAdminPermissionConfig(bad), JSON.stringify(bad)).toThrow();
    }
  });
});
