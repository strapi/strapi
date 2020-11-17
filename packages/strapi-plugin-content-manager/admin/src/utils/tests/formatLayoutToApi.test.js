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
});
