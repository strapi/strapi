import formatLayoutToApi from '../formatLayoutToApi';

describe('CONTENT MANAGER | utils | formatLayoutToApi', () => {
  it('should format the list layout correctly if it is an array of objects', () => {
    const layouts = {
      list: [{ name: 'test', size: 6 }],
      edit: [],
      editRelations: [],
    };

    expect(formatLayoutToApi({ layouts }).layouts.list).toEqual(['test']);
  });

  it('should format the list layout correctly if it is an array of strings', () => {
    const layouts = {
      list: ['test'],
      edit: [],
      editRelations: [],
    };

    expect(formatLayoutToApi({ layouts }).layouts.list).toEqual(['test']);
  });

  it('should remove the mainField in the metadatas relations list', () => {
    const layouts = {
      list: ['test'],
      edit: [],
      editRelations: [{ name: 'categories' }],
    };
    const metadatas = {
      categories: {
        list: {
          mainField: {
            name: 'name',
            schema: {
              type: 'string',
            },
          },
          data: 1,
        },
      },
    };

    expect(
      formatLayoutToApi({ layouts, metadatas }).metadatas.categories.list.mainField
    ).toBeUndefined();
  });
});
