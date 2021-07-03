import getRedirectionLink, { mergeParams } from '../getRedirectionLink';

describe('CONTENT MANAGER | Containers | CollectionTypeFormWrapper | utils', () => {
  describe('getRedirectionLink', () => {
    it('should return an when no links is matching the slug', () => {
      const links = [
        {
          to: '/cm/foo',
          search: 'page=1&pageSize=10',
        },
        {
          to: '/cm/bar',
          search: 'page=1&pageSize=10',
        },
      ];
      const slug = 'create';
      const result = getRedirectionLink(links, slug, '');

      expect(result).toEqual('/');
    });
    it('should not mutate the link when the rawQuery is empty', () => {
      const links = [
        {
          to: '/cm/foo',
          search: 'page=1&pageSize=10',
        },
        {
          to: '/cm/bar',
          search: 'page=1&pageSize=10',
        },
      ];
      const slug = 'foo';
      const result = getRedirectionLink(links, slug, '');

      expect(result).toEqual('/cm/foo?page=1&pageSize=10');
    });

    it('should merge the current search with the link original one', () => {
      const links = [
        {
          to: '/cm/foo',
          search: 'page=1&pageSize=10&plugins[i18n][locale]=en',
        },
        {
          to: '/cm/bar',
          search: 'page=1&pageSize=10&plugins[i18n][locale]=en',
        },
      ];
      const slug = 'bar';
      const currentSearch = '?plugins[i18n][locale]=fr&plugins[i18n][relatedEntity]=1';
      const result = getRedirectionLink(links, slug, currentSearch);
      const expected = '/cm/bar?page=1&pageSize=10&plugins[i18n][locale]=fr';

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
