import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Schema } from '@strapi/types';
import entityValidator from '..';

/**
 * On update, a component sent without an `id` is not updated: the document service creates a
 * new component (see `updateOrCreateComponent`). Its fields have no previous value to keep, so
 * they must be validated as on creation.
 */
describe('Entity validator - new component in an update', () => {
  const component: Schema.Component = {
    modelType: 'component',
    uid: 'default.inner',
    category: 'default',
    modelName: 'inner',
    globalId: 'ComponentDefaultInner',
    info: {
      displayName: 'inner',
    },
    options: {},
    attributes: {
      title: {
        type: 'string',
        required: true,
      },
    },
  };

  const outerComponent: Schema.Component = {
    modelType: 'component',
    uid: 'default.outer',
    category: 'default',
    modelName: 'outer',
    globalId: 'ComponentDefaultOuter',
    info: {
      displayName: 'outer',
    },
    options: {},
    attributes: {
      items: {
        type: 'component',
        component: 'default.inner',
        repeatable: true,
      },
    },
  };

  // `extra` is required only when visible, and visible only when `kind` is not its default
  const conditionalComponent: Schema.Component = {
    modelType: 'component',
    uid: 'default.conditional',
    category: 'default',
    modelName: 'conditional',
    globalId: 'ComponentDefaultConditional',
    info: {
      displayName: 'conditional',
    },
    options: {},
    attributes: {
      kind: {
        type: 'enumeration',
        enum: ['a', 'b'],
        default: 'a',
      },
      extra: {
        type: 'string',
        required: true,
        conditions: {
          visible: { '!=': [{ var: 'kind' }, 'a'] },
        },
      },
    },
  };

  const contentType: Schema.ContentType = {
    modelType: 'contentType',
    uid: 'api::test.test',
    kind: 'collectionType',
    modelName: 'test',
    globalId: 'test',
    info: {
      displayName: 'Test',
      singularName: 'test',
      pluralName: 'tests',
    },
    options: {},
    attributes: {
      single: {
        type: 'component',
        component: 'default.inner',
        repeatable: false,
      },
      repeatable: {
        type: 'component',
        component: 'default.inner',
        repeatable: true,
      },
      dz: {
        type: 'dynamiczone',
        components: ['default.inner'],
      },
      outer: {
        type: 'component',
        component: 'default.outer',
        repeatable: false,
      },
      conditional: {
        type: 'component',
        component: 'default.conditional',
        repeatable: false,
      },
    },
  };

  const models: Record<string, Schema.Schema> = {
    [component.uid]: component,
    [outerComponent.uid]: outerComponent,
    [conditionalComponent.uid]: conditionalComponent,
    [contentType.uid]: contentType,
  };

  const entity = { id: 1 };

  beforeEach(() => {
    global.strapi = {
      errors: {
        badRequest: vi.fn(),
      },
      getModel: (uid: string) => models[uid],
      components: {
        [component.uid]: component,
        [outerComponent.uid]: outerComponent,
        [conditionalComponent.uid]: conditionalComponent,
      },
    } as any;
  });

  describe('Published update', () => {
    test('Throws when a new single component misses a required field', async () => {
      await expect(
        entityValidator.validateEntityUpdate(
          contentType,
          { single: {} },
          { isDraft: false },
          entity
        )
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'single.title must be defined.',
      });
    });

    test('Throws when a new repeatable component item misses a required field', async () => {
      await expect(
        entityValidator.validateEntityUpdate(
          contentType,
          { repeatable: [{ id: 1, title: 'kept' }, {}] },
          { isDraft: false },
          entity
        )
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'repeatable[1].title must be defined.',
      });
    });

    test('Throws when a new dynamic zone item misses a required field', async () => {
      await expect(
        entityValidator.validateEntityUpdate(
          contentType,
          { dz: [{ __component: 'default.inner' }] },
          { isDraft: false },
          entity
        )
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'dz[0].title must be defined.',
      });
    });

    test('Accepts an existing component that does not send a required field', async () => {
      const input = {
        single: { id: 1 },
        repeatable: [{ id: 2 }],
        dz: [{ __component: 'default.inner', id: 3 }],
      };

      await expect(
        entityValidator.validateEntityUpdate(contentType, input, { isDraft: false }, entity)
      ).resolves.toEqual(input);
    });

    test('Throws when an existing component sets a required field to null', async () => {
      await expect(
        entityValidator.validateEntityUpdate(
          contentType,
          { single: { id: 1, title: null } },
          { isDraft: false },
          entity
        )
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'single.title must be a `string` type, but the final value was: `null`.',
      });
    });
  });

  describe('Conditional visibility of a new component field', () => {
    test('Accepts a new component hiding a required field through a default value on update', async () => {
      const input = { conditional: {} };

      await expect(
        entityValidator.validateEntityUpdate(contentType, input, { isDraft: false }, entity)
      ).resolves.toEqual({ conditional: { kind: 'a' } });
    });

    test('Accepts a new component hiding a required field through a default value on creation', async () => {
      const input = { conditional: {} };

      await expect(
        entityValidator.validateEntityCreation(contentType, input, { isDraft: false })
      ).resolves.toMatchObject({ conditional: { kind: 'a' } });
    });

    test('Throws when a new component shows a required field and misses it', async () => {
      await expect(
        entityValidator.validateEntityUpdate(
          contentType,
          { conditional: { kind: 'b' } },
          { isDraft: false },
          entity
        )
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'conditional.extra must be defined.',
      });
    });
  });

  describe('Draft update', () => {
    test('Accepts a new component that misses a required field', async () => {
      const input = {
        single: {},
        repeatable: [{}],
        dz: [{ __component: 'default.inner' }],
      };

      await expect(
        entityValidator.validateEntityUpdate(contentType, input, { isDraft: true }, entity)
      ).resolves.toEqual(input);
    });

    test('Accepts a new component that does not send a nested repeatable component', async () => {
      const input = { outer: {} };

      await expect(
        entityValidator.validateEntityUpdate(contentType, input, { isDraft: true }, entity)
      ).resolves.toEqual(input);
    });
  });
});
