import { testData } from '../../../../tests/data';
import { removeProhibitedFields } from '../data';

describe('data', () => {
  describe('removeProhibitedFields', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(removeProhibitedFields(['password'])(contentType, components)({})).toEqual({});
    });

    it('should return the initial data if there is no password field', () => {
      const { components, contentType } = testData;

      expect(
        removeProhibitedFields(['password'])(contentType, components)({ name: 'test' })
      ).toEqual({
        name: 'test',
      });
    });

    it('should remove the password field for a simple data structure', () => {
      const { components, contentType } = testData;

      expect(
        removeProhibitedFields(['password'])(contentType, components)({
          name: 'test',
          password: 'password',
        })
      ).toEqual({ name: 'test', password: '' });
    });

    it('should remove all password fields', () => {
      const { components, contentType, modifiedData } = testData;

      expect(removeProhibitedFields(['password'])(contentType, components)(modifiedData))
        .toMatchInlineSnapshot(`
        {
          "createdAt": "2020-04-28T13:22:13.033Z",
          "dz": [
            {
              "__component": "compos.sub-compo",
              "id": 7,
              "name": "name",
              "password": "",
            },
            {
              "__component": "compos.test-compo",
              "id": 4,
              "name": "name",
              "password": "",
              "subcomponotrepeatable": null,
              "subrepeatable": [],
            },
            {
              "__component": "compos.test-compo",
              "id": 5,
              "name": "name",
              "password": "",
              "subcomponotrepeatable": {
                "id": 9,
                "name": "name",
                "password": "",
              },
              "subrepeatable": [
                {
                  "id": 8,
                  "name": "name",
                  "password": "",
                },
              ],
            },
            {
              "__component": "compos.test-compo",
              "id": 6,
              "name": null,
              "password": null,
              "subcomponotrepeatable": null,
              "subrepeatable": [],
            },
          ],
          "id": 1,
          "name": "name",
          "notrepeatable": {
            "id": 1,
            "name": "name",
            "password": "",
            "subcomponotrepeatable": {
              "id": 4,
              "name": "name",
              "password": "",
            },
            "subrepeatable": [
              {
                "id": 1,
                "name": "name",
                "password": "",
              },
              {
                "id": 2,
                "name": "name",
                "password": "",
              },
              {
                "id": 3,
                "name": "name",
                "password": "",
              },
            ],
          },
          "password": "",
          "repeatable": [
            {
              "id": 2,
              "name": "name",
              "password": "",
              "subcomponotrepeatable": {
                "id": 6,
                "name": "name",
                "password": "",
              },
              "subrepeatable": [
                {
                  "id": 5,
                  "name": "name",
                  "password": "",
                },
              ],
            },
            {
              "id": 3,
              "name": "name",
              "password": "",
              "subcomponotrepeatable": null,
              "subrepeatable": [],
            },
          ],
          "updatedAt": "2020-04-28T13:22:13.033Z",
        }
      `);
    });
  });
});
