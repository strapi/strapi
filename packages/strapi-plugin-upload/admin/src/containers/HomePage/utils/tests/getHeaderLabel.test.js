import getHeaderLabel from '../getHeaderLabel';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('getHeaderLabel', () => {
    it('should return the header translation with this empty suffix if count is 0', () => {
      const count = 0;
      const expected = 'header.content.assets-empty';

      expect(getHeaderLabel(count)).toEqual(expected);
    });

    it('should return the header translation with this single suffix if count is 1', () => {
      const count = 1;
      const expected = 'header.content.assets-single';

      expect(getHeaderLabel(count)).toEqual(expected);
    });

    it('should return the header translation with this multiple suffix if count is greater than 1', () => {
      const count = 2;
      const expected = 'header.content.assets-multiple';

      expect(getHeaderLabel(count)).toEqual(expected);
    });
  });
});
