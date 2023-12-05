import { testData } from '../../tests/data';
import { mergeMetasWithSchema } from '../schemas';

describe('schemas', () => {
  describe('mergeMetasWithSchema', () => {
    it('should add an attributes property to the mainSchema', () => {
      const data = {
        contentType: {
          metadatas: {},
          uid: 'api::test.test',
        },
        components: {},
      };

      // @ts-expect-error – TODO: fix this
      const results = mergeMetasWithSchema(data, [testData.contentType], 'contentType');
      expect(results).toHaveProperty('contentType');
      expect(results).toHaveProperty('components');
      expect(results.contentType).toHaveProperty('metadatas');
      expect(results.contentType.attributes).toEqual(testData.contentType.attributes);
    });

    it('should add the attribute propety to the main schema and the components', () => {
      const data = {
        component: {
          uid: 'test.test',
          metadatas: {
            ok: true,
          },
        },
        components: {
          'test.test': {
            uid: 'test.test',
            metadata: { ok: true },
          },
        },
      };
      const expected = {
        component: {
          uid: 'test.test',
          metadatas: {
            ok: true,
          },
          attributes: { test: { type: 'text' } },
        },
        components: {
          'test.test': {
            uid: 'test.test',
            metadata: { ok: true },
            attributes: { test: { type: 'text' } },
          },
        },
      };
      const schemas = [{ uid: 'test.test', attributes: { test: { type: 'text' } } }];
      // @ts-expect-error – TODO: fix this
      expect(mergeMetasWithSchema(data, schemas, 'component')).toEqual(expected);
    });
  });
});
