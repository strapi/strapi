import { formatLayoutForSettingsView } from '../layouts';

describe('layouts', () => {
  describe('formatLayoutForSettingsView', () => {
    it('should format the list layout correctly if it is an array of objects', () => {
      const layouts = {
        list: [{ name: 'test', size: 6 }],
        edit: [],
      };

      // @ts-expect-error – Mock information
      expect(formatLayoutForSettingsView({ layouts, metadatas: {} }).layouts.list).toEqual([
        'test',
      ]);
    });

    it('should format the list layout correctly if it is an array of strings', () => {
      const layouts = {
        list: ['test'],
        edit: [],
      };

      // @ts-expect-error – Mock information
      expect(formatLayoutForSettingsView({ layouts, metadatas: {} }).layouts.list).toEqual([
        'test',
      ]);
    });

    it('should remove the mainField in the metadatas relations list', () => {
      const layouts = {
        list: ['test'],
        edit: [],
      };
      const metadatas = {
        categories: {
          edit: {
            mainField: {
              name: 'name',
              schema: {
                type: 'string',
              },
            },
            label: 'categories',
          },
          list: {
            mainField: {
              name: 'name',
              schema: {
                type: 'string',
              },
            },
            label: 'categories',
          },
        },
      };
      const expectedMetadatas = {
        categories: {
          edit: {
            mainField: 'name',
            label: 'categories',
          },
          list: {
            label: 'categories',
          },
        },
      };

      // @ts-expect-error – Mock information
      const result = formatLayoutForSettingsView({ layouts, metadatas }).metadatas;

      expect(result).toEqual(expectedMetadatas);
    });
  });
});
