import formatLayoutToApi from '../formatLayoutToApi';

describe('CONTENT MANAGER | utils | formatLayoutToApi', () => {
  it('should format the list layout correctly if it is an array of objects', () => {
    const layouts = {
      list: [{ name: 'test', size: 6 }],
      edit: [],
      editRelations: [],
    };

    expect(formatLayoutToApi({ layouts, metadatas: {} }).layouts.list).toEqual(['test']);
  });

  it('should format the list layout correctly if it is an array of strings', () => {
    const layouts = {
      list: ['test'],
      edit: [],
      editRelations: [],
    };

    expect(formatLayoutToApi({ layouts, metadatas: {} }).layouts.list).toEqual(['test']);
  });

  it('should remove the mainField in the metadatas relations list', () => {
    const layouts = {
      list: ['test'],
      edit: [],
      editRelations: [],
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

    const result = formatLayoutToApi({ layouts, metadatas }).metadatas;

    expect(result).toEqual(expectedMetadatas);
  });
});
