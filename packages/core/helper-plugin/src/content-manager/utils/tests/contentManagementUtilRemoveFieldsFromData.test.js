import testData from './testData';
import contentManagementUtilRemoveFieldsFromData from '../contentManagementUtilRemoveFieldsFromData';

describe('STRAPI_HELPER_PLUGIN | utils', () => {
  describe('contentManagementUtilRemoveFieldsFromData', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(contentManagementUtilRemoveFieldsFromData({}, contentType, components)).toEqual({});
    });

    it('should return the initial data if there is no field with the specified key', () => {
      const { components, contentType } = testData;

      expect(
        contentManagementUtilRemoveFieldsFromData({ name: 'test' }, contentType, components, [
          '_id',
        ])
      ).toEqual({
        name: 'test',
      });
    });

    it('should remove the specified field for a simple data structure', () => {
      const { components, contentType } = testData;
      const data = { _id: 'test', name: 'test' };
      const expected = { name: 'test' };

      expect(
        contentManagementUtilRemoveFieldsFromData(data, contentType, components, ['_id'])
      ).toEqual(expected);
    });

    it('should remove all the default fields', () => {
      const { components, modifiedData, expectedNoFieldsModifiedData } = testData;
      const contentType = {
        apiID: 'test',
        options: {
          timestamps: ['createdAt', 'updatedAt'],
        },
        attributes: {
          createdAt: { type: 'timestamp' },
          dz: { type: 'dynamiczone', components: ['compos.test-compo', 'compos.sub-compo'] },
          id: { type: 'integer' },
          name: { type: 'string' },
          notrepeatable: {
            type: 'component',
            repeatable: false,
            component: 'compos.test-compo',
          },
          password: { type: 'password' },
          repeatable: { type: 'component', repeatable: true, component: 'compos.test-compo' },
          updatedAt: { type: 'timestamp' },
        },
      };

      expect(
        contentManagementUtilRemoveFieldsFromData(modifiedData, contentType, components)
      ).toEqual(expectedNoFieldsModifiedData);
    });
  });
});
