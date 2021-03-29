import getDeleteRedirectionLink, { mergeParams } from '../getDeleteRedirectionLink';

describe('CONTENT MANAGER | Containers | CollectionTypeFormWrapper | utils ', () => {
  describe('getDeleteRedirectionLink', () => {
    it('should return an when no links is matching the slug', () => {
      const links = [
        {
          destination: '/cm/foo',
          search: 'page=1&pageSize=10',
        },
        {
          destination: '/cm/bar',
          search: 'page=1&pageSize=10',
        },
      ];
      const slug = 'create';
      const result = getDeleteRedirectionLink(links, slug, '');

      expect(result).toEqual({ destination: '/', search: '' });
    });
    it('should not mutate the link when the rawQuery is empty', () => {
      const links = [
        {
          destination: '/cm/foo',
          search: 'page=1&pageSize=10',
        },
        {
          destination: '/cm/bar',
          search: 'page=1&pageSize=10',
        },
      ];
      const slug = 'foo';
      const result = getDeleteRedirectionLink(links, slug, '');

      expect(result).toEqual(links[0]);
    });

    it('should merge the current search with the link original one', () => {
      const links = [
        {
          destination: '/cm/foo',
          search: 'page=1&pageSize=10&plugins[i18n][locale]=en',
        },
        {
          destination: '/cm/bar',
          search: 'page=1&pageSize=10&plugins[i18n][locale]=en',
        },
      ];
      const slug = 'bar';
      const currentSearch = '?plugins[i18n][locale]=fr&plugins[i18n][relatedEntity]=1';
      const result = getDeleteRedirectionLink(links, slug, currentSearch);
      const expected = {
        destination: '/cm/bar',
        search: 'page=1&pageSize=10&plugins[i18n][locale]=fr',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('mergeParams', () => {
    it('should merge 2 objects correctly', () => {
      expect(mergeParams({ ok: true }, null)).toEqual({ ok: true });
    });

    it('should merge 2 complexe objects correctly', () => {
      const ref = {
        page: '1',
        pageSize: '10',
        plugins: {
          a: 'atest',
          b: 'btest',
          c: {
            locale: 'test',
            id: 'id',
          },
        },
      };
      const updater = {
        plugins: {
          a: 'updated',
          c: {
            locale: 'test updated',
            relatedEntity: 'test',
          },
        },
      };
      const expected = {
        page: '1',
        pageSize: '10',
        plugins: {
          a: 'updated',
          b: 'btest',
          c: {
            locale: 'test updated',
            id: 'id',
          },
        },
      };

      expect(mergeParams(ref, updater)).toEqual(expected);
    });
  });
});
