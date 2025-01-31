import { sortContentType } from '../cleanData';

import type { ContentTypes, ContentType } from '../../../../types';

describe('CleanData utils', () => {
  describe('sortContentType', () => {
    it('should return sorted collection types array', () => {
      const input: ContentTypes = {
        'api::category.category': {
          uid: 'api::category.category',
          globalId: 'category',
          modelName: 'category',
          kind: 'collectionType',
          modelType: 'contentType',
          restrictRelationsTo: null,
          status: 'UNCHANGED',
          visible: true,
          info: {
            displayName: 'category',
            singularName: 'category',
            pluralName: 'category',
          },
          attributes: [],
        },
        'api::address.address': {
          uid: 'api::address.address',
          globalId: 'address',
          modelName: 'address',
          kind: 'collectionType',
          modelType: 'contentType',
          restrictRelationsTo: null,
          status: 'UNCHANGED',
          visible: true,
          info: {
            displayName: 'address',
            singularName: 'address',
            pluralName: 'address',
          },
          attributes: [],
        },
      };

      expect(sortContentType(input)).toMatchInlineSnapshot(`
        [
          {
            "kind": "collectionType",
            "name": "api::address.address",
            "plugin": undefined,
            "restrictRelationsTo": null,
            "status": "UNCHANGED",
            "title": "address",
            "to": "/plugins/content-type-builder/content-types/api::address.address",
            "uid": "api::address.address",
            "visible": true,
          },
          {
            "kind": "collectionType",
            "name": "api::category.category",
            "plugin": undefined,
            "restrictRelationsTo": null,
            "status": "UNCHANGED",
            "title": "category",
            "to": "/plugins/content-type-builder/content-types/api::category.category",
            "uid": "api::category.category",
            "visible": true,
          },
        ]
      `);
    });

    it('should return an empty array if no content types', () => {
      expect(sortContentType({})).toEqual([]);
    });
  });
});
