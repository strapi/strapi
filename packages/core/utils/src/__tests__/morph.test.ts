import { ValidationError } from '../errors';
import * as sanitizeVisitors from '../sanitize/visitors';
import * as validateVisitors from '../validate/visitors';

describe('restricted relations', () => {
  describe('polymorphic relations', () => {
    const auth = {};
    const morphKeys = ['morph'];
    const removeRestrictedRelationsFn = sanitizeVisitors.removeRestrictedRelations(auth);
    const throwRestrictedRelationsFn = validateVisitors.throwRestrictedRelations(auth);

    const attribute = {
      type: 'relation',
      relation: 'morphToMany',
      target: 'admin::user',
    };

    // we don't care about actual relation permissions here, only that the properties are sanitized and validated correctly
    global.strapi = {
      auth: {
        verify(_config, auth) {
          if (auth.scope === 'undefined.find') {
            throw new Error('no permissions');
          }

          return true;
        },
      },
    };

    test('sanitizes morph relations connect, set, disconnect, and options', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      const promises = morphKeys.map(async (key) => {
        return removeRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: [
                  { __type: 'api::admin:morphtest', id: 1 },
                  'invalid', // to be removed
                ],
                set: [
                  { __type: 'api::admin:morphtest', id: 1 },
                  'invalid', // to be removed
                ],
                disconnect: [
                  { __type: 'api::admin:morphtest', id: 1 },
                  'invalid', // to be removed
                ],
                options: {
                  strict: false,
                  fakeOption: { fake: 'string' }, // to be removed
                },
                fakeProp: 'asdf', // to be removed
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);

      expect(remove).toHaveBeenCalledTimes(0);
      expect(set).toBeCalledTimes(1);
      expect(set).toHaveBeenCalledWith('morph', {
        connect: [{ __type: 'api::admin:morphtest', id: 1 }],
        disconnect: [{ __type: 'api::admin:morphtest', id: 1 }],
        options: { strict: false },
        set: [{ __type: 'api::admin:morphtest', id: 1 }],
      });
    });
    test('validates valid morph relations connect, set, disconnect, and options', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      // as long as it doesn't throw is the main test
      const promises = morphKeys.map(async (key) => {
        return throwRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: [{ __type: 'api::admin:morphtest', id: 1 }],
                set: [{ __type: 'api::admin:morphtest', id: 1 }],
                disconnect: [{ __type: 'api::admin:morphtest', id: 1 }],
                options: {
                  strict: false,
                },
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });

      await expect(Promise.all(promises)).resolves.not.toThrow();

      expect(remove).toHaveBeenCalledTimes(0);
      expect(set).toBeCalledTimes(0);
    });

    test('throws an error for invalid morph relations option', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      const promises = morphKeys.map(async (key) => {
        return throwRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: [{ __type: 'api::admin:morphtest', id: 1 }],
                set: [{ __type: 'api::admin:morphtest', id: 1 }],
                disconnect: [{ __type: 'api::admin:morphtest', id: 1 }],
                options: {
                  invalidoption: true, // Invalid
                },
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });
      await expect(Promise.all(promises)).rejects.toThrow(
        new ValidationError('Invalid key invalidoption')
      );
    });

    test('throws an error for invalid morph relations connect', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      const promises = morphKeys.map(async (key) => {
        return throwRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: ['invalidString'], // Invalid
                set: [{ __type: 'api::admin:morphtest', id: 1 }],
                disconnect: [{ __type: 'api::admin:morphtest', id: 1 }],
                options: {},
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });

      await expect(Promise.all(promises)).rejects.toThrow(new ValidationError('Invalid key morph'));
    });

    test('throws an error for invalid morph relations set', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      const promises = morphKeys.map(async (key) => {
        return throwRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: [{ __type: 'api::admin:morphtest', id: 1 }],
                set: ['invalidString'], // Invalid
                disconnect: [{ __type: 'api::admin:morphtest', id: 1 }],
                options: {},
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });

      await expect(Promise.all(promises)).rejects.toThrow(new ValidationError('Invalid key morph'));
    });

    test('throws an error for invalid morph relations disconnect', async () => {
      const remove = jest.fn();
      const set = jest.fn();

      const promises = morphKeys.map(async (key) => {
        return throwRestrictedRelationsFn(
          {
            data: {
              morph: {
                connect: [{ __type: 'api::admin:morphtest', id: 1 }],
                set: [{ __type: 'api::admin:morphtest', id: 1 }],
                disconnect: ['invalidString'], // Invalid
                options: {},
              },
            },
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {
                morph: attribute,
              },
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });

      await expect(Promise.all(promises)).rejects.toThrow(new ValidationError('Invalid key morph'));
    });
  });
});
