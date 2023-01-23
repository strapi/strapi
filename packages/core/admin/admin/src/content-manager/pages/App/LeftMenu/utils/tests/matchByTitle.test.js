import { matchByTitle } from '../index';

describe('Content Manager | Pages | LeftMenu | Utils', () => {
  describe('matchByTitle', () => {
    it('correctly sorts a list of links with special characters', () => {
      const links = [
        {
          title: 'zebra',
        },
        {
          title: 'Address',
        },
        {
          title: 'dog',
        },
        {
          title: 'škola',
        },
        {
          title: 'Članky',
        },
      ];

      expect(matchByTitle(links)).toEqual([
        {
          title: 'Address',
        },
        {
          title: 'Članky',
        },
        {
          title: 'dog',
        },
        {
          title: 'škola',
        },
        {
          title: 'zebra',
        },
      ]);
    });
  });
});
