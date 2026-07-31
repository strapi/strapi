import type { Schema } from '@strapi/types';
import entityValidator from '..';

describe('Entity validator', () => {
  const modelBase: Schema.ContentType = {
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
    attributes: {},
  };

  describe('Published input', () => {
    describe('General Errors', () => {
      let model: Schema.ContentType;
      global.strapi = {
        errors: {
          badRequest: jest.fn(),
        },
        getModel: () => model,
      } as any;

      it('Throws a badRequest error on invalid input', async () => {
        model = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `1234`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `1234`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Returns data on valid input', async () => {
        model = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        model = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
            number: {
              type: 'integer',
            },
          },
        };

        const input = { title: 'Test', number: '123' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Throws on required not respected', async () => {
        model = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, {});
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be defined.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be defined.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }

        try {
          await entityValidator.validateEntityCreation(model, { title: null });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `null`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `null`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Supports custom field types', async () => {
        model = {
          ...modelBase,
          attributes: {
            uuid: {
              // @ts-expect-error -- Custom field type is intentionally outside the schema type union.
              type: 'uuid',
            },
          },
        };

        const input = { uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual({
          uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7',
        });
      });
    });

    describe('String validator', () => {
      test('Throws on min length not respected', async () => {
        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        } as any;

        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              minLength: 10,
            },
          },
        };

        const input = { title: 'tooSmall' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at least 10 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at least 10 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Throws on max length not respected', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              maxLength: 2,
            },
          },
        };

        const input = { title: 'tooLong' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at most 2 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at most 2 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Allows empty strings even when required', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'New',
            },
            type: {
              type: 'string',
              default: 'test',
            },
            testDate: {
              type: 'date',
              required: true,
              default: '2020-04-01T04:00:00.000Z',
            },
            testJSON: {
              type: 'json',
              required: true,
              default: {
                foo: 1,
                bar: 2,
              },
            },
          },
        };

        await expect(entityValidator.validateEntityCreation(model, {})).resolves.toMatchObject({
          title: 'New',
          type: 'test',
          testDate: '2020-04-01T04:00:00.000Z',
          testJSON: {
            foo: 1,
            bar: 2,
          },
        });
      });

      test("Don't assign default value if empty string", async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'default',
            },
            content: {
              type: 'string',
              default: 'default',
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(model, {
            title: '',
            content: '',
          })
        ).resolves.toMatchObject({
          title: '',
          content: '',
        });
      });
    });
  });

  describe('Draft input', () => {
    describe('General Errors', () => {
      it('Throws a badRequest error on invalid input', async () => {
        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        } as any;

        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `1234`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `1234`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Returns data on valid input', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
            number: {
              type: 'integer',
            },
          },
        };

        const input = { title: 'Test', number: '123' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Does not throws on required not respected', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        let data = await entityValidator.validateEntityCreation(model, {}, { isDraft: true });
        expect(data).toEqual({});

        data = await entityValidator.validateEntityCreation(
          model,
          { title: null },
          { isDraft: true }
        );
        expect(data).toEqual({ title: null });
      });

      test('Throws on omitted required repeatable component and dynamic zone (aggregates are not draft-exempt)', async () => {
        // Aggregates are the carve-out from draft required-leniency: `createComponentValidator`
        // (repeatable branch) and `createDzValidator` both pass a hard-coded `required: true` to
        // `addRequiredValidation` regardless of `isDraft`, and `addDefault` only substitutes `[]`
        // for aggregates that are *not* required. So the key must be present even on a draft.
        const component: Schema.Component = {
          modelType: 'component',
          uid: 'default.seo',
          modelName: 'seo',
          globalId: 'ComponentDefaultSeo',
          category: 'default',
          info: { displayName: 'Seo' },
          attributes: { label: { type: 'string' } },
        };

        global.strapi = {
          errors: { badRequest: jest.fn() },
          getModel: () => component,
          components: { 'default.seo': component },
        } as any;

        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            links: {
              type: 'component',
              component: 'default.seo',
              repeatable: true,
              required: true,
            },
            sections: {
              type: 'dynamiczone',
              components: ['default.seo'],
              required: true,
            },
          },
        };

        // Omitting either aggregate key throws, unlike the required scalar above.
        await expect(
          entityValidator.validateEntityCreation(model, { sections: [] }, { isDraft: true })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        await expect(
          entityValidator.validateEntityCreation(model, { links: [] }, { isDraft: true })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        // Present-but-empty satisfies it — the validator wants the key, not the contents.
        await expect(
          entityValidator.validateEntityCreation(
            model,
            { links: [], sections: [] },
            { isDraft: true }
          )
        ).resolves.toMatchObject({ links: [], sections: [] });
      });

      test('Accepts omitted required repeatable component and dynamic zone on update, but rejects explicit null', async () => {
        // The update counterpart of the creation case above, and the reason the MCP schema can
        // relax required aggregates on `update` while keeping them on `create`. Here
        // `addRequiredValidation` applies `notNull()` rather than `notNil()`, and `addDefault`
        // uses `default(undefined)`, so an absent key is a no-op patch — but an explicit `null`
        // still fails. Pinning both halves means a future switch to `notNil()` breaks this test
        // instead of silently invalidating the advertised MCP contract.
        const component: Schema.Component = {
          modelType: 'component',
          uid: 'default.seo',
          modelName: 'seo',
          globalId: 'ComponentDefaultSeo',
          category: 'default',
          info: { displayName: 'Seo' },
          attributes: { label: { type: 'string' } },
        };

        global.strapi = {
          errors: { badRequest: jest.fn() },
          getModel: () => component,
          components: { 'default.seo': component },
        } as any;

        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            links: {
              type: 'component',
              component: 'default.seo',
              repeatable: true,
              required: true,
            },
            sections: {
              type: 'dynamiczone',
              components: ['default.seo'],
              required: true,
            },
          },
        };

        // Omitting both aggregate keys is a valid partial update, unlike on creation.
        await expect(
          entityValidator.validateEntityUpdate(model, {}, { isDraft: true })
        ).resolves.toEqual({});

        // Omitting either one individually is equally fine.
        await expect(
          entityValidator.validateEntityUpdate(model, { links: [] }, { isDraft: true })
        ).resolves.toMatchObject({ links: [] });

        await expect(
          entityValidator.validateEntityUpdate(model, { sections: [] }, { isDraft: true })
        ).resolves.toMatchObject({ sections: [] });

        // Explicit null is not an omission — `notNull()` rejects it on both aggregates.
        await expect(
          entityValidator.validateEntityUpdate(model, { links: null }, { isDraft: true })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        await expect(
          entityValidator.validateEntityUpdate(model, { sections: null }, { isDraft: true })
        ).rejects.toMatchObject({ name: 'ValidationError' });
      });

      it('Supports custom field types', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            uuid: {
              // @ts-expect-error -- Custom field type is intentionally outside the schema type union.
              type: 'uuid',
            },
          },
        };

        const input = { uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual({
          uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7',
        });
      });
    });

    describe('String validator', () => {
      test('Does not throws on min length not respected', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              minLength: 10,
            },
          },
        };

        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        } as any;

        const input = { title: 'tooSmall' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Throws on max length not respected', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              maxLength: 2,
            },
          },
        };

        const input = { title: 'tooLong' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at most 2 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at most 2 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Allows empty strings even when required', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'New',
            },
            type: {
              type: 'string',
              default: 'test',
            },
            testDate: {
              type: 'date',
              required: true,
              default: '2020-04-01T04:00:00.000Z',
            },
            testJSON: {
              type: 'json',
              required: true,
              default: {
                foo: 1,
                bar: 2,
              },
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(model, {}, { isDraft: true })
        ).resolves.toMatchObject({
          title: 'New',
          type: 'test',
          testDate: '2020-04-01T04:00:00.000Z',
          testJSON: {
            foo: 1,
            bar: 2,
          },
        });
      });

      test("Don't assign default value if empty string", async () => {
        const model: Schema.ContentType = {
          ...modelBase,
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'default',
            },
            content: {
              type: 'string',
              default: 'default',
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(
            model,
            {
              title: '',
              content: '',
            },
            { isDraft: true }
          )
        ).resolves.toMatchObject({
          title: '',
          content: '',
        });
      });
    });
  });
});
