import findFirstAllowedEndpoint, { generateArrayOfLinks } from '../findFirstAllowedEndpoint';

describe('ADMIN | SettingsPage | utils', () => {
  describe('findFirstAllowedEndpoint', () => {
    it('should return null if there is no sections', () => {
      expect(findFirstAllowedEndpoint([])).toBeNull();
    });

    it('should return null if all links are hidden', () => {
      const data = [
        {
          id: 'global',
          links: [
            {
              to: 'global.test',
              isDisplayed: false,
            },
            {
              to: 'global.test2',
              isDisplayed: false,
            },
          ],
        },
        {
          id: 'test',
          links: [
            {
              to: 'test.test',
              isDisplayed: false,
            },
            {
              to: 'test.test2',
              isDisplayed: false,
            },
          ],
        },
      ];

      expect(findFirstAllowedEndpoint(data)).toBeNull();
    });

    it('should return the destination of the first displayed link', () => {
      const data = [
        {
          id: 'global',
          links: [
            {
              to: 'global.test',
              isDisplayed: false,
            },
            {
              to: 'global.test2',
              isDisplayed: false,
            },
          ],
        },
        {
          id: 'test',
          links: [
            {
              to: 'test.test',
              isDisplayed: false,
            },
            {
              to: 'test.test2',
              isDisplayed: true,
            },
            {
              to: 'test.test3',
              isDisplayed: true,
            },
          ],
        },
        {
          id: 'test1',
          links: [
            {
              to: 'test1.test',
              isDisplayed: true,
            },
            {
              to: 'test1.test2',
              isDisplayed: true,
            },
            {
              to: 'test1.test3',
              isDisplayed: true,
            },
          ],
        },
      ];

      expect(findFirstAllowedEndpoint(data)).toEqual('test.test2');
    });
  });

  describe('generateArrayOfLinks', () => {
    it('should return an empty array', () => {
      expect(generateArrayOfLinks([])).toEqual([]);
    });

    it('should return an array containing all the links', () => {
      const data = [
        {
          id: 'global',
          links: [
            {
              to: 'global.test',
              isDisplayed: false,
            },
            {
              to: 'global.test2',
              isDisplayed: false,
            },
          ],
        },
        {
          id: 'test',
          links: [
            {
              to: 'test.test',
              isDisplayed: false,
            },
            {
              to: 'test.test2',
              isDisplayed: true,
            },
            {
              to: 'test.test3',
              isDisplayed: true,
            },
          ],
        },
        {
          id: 'test1',
          links: [
            {
              to: 'test1.test',
              isDisplayed: true,
            },
            {
              to: 'test1.test2',
              isDisplayed: true,
            },
            {
              to: 'test1.test3',
              isDisplayed: true,
            },
          ],
        },
      ];
      const expected = [
        {
          to: 'global.test',
          isDisplayed: false,
        },
        {
          to: 'global.test2',
          isDisplayed: false,
        },
        {
          to: 'test.test',
          isDisplayed: false,
        },
        {
          to: 'test.test2',
          isDisplayed: true,
        },
        {
          to: 'test.test3',
          isDisplayed: true,
        },
        {
          to: 'test1.test',
          isDisplayed: true,
        },
        {
          to: 'test1.test2',
          isDisplayed: true,
        },
        {
          to: 'test1.test3',
          isDisplayed: true,
        },
      ];

      expect(generateArrayOfLinks(data)).toEqual(expected);
    });
  });
});
