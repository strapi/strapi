import getHeaderLabel from '../getHeaderLabel';

describe('MEDIA LIBRARY | containers | HomePage | utils', () => {
  describe('getHeaderLabel', () => {
    it('should return the header translation with this empty suffix if there is no data', () => {
      const data = [];
      const expected = 'header.content.assets-empty';

      expect(getHeaderLabel(data)).toEqual(expected);
    });

    it('should return the header translation with this single suffix if there is 1 element', () => {
      const data = ['test'];
      const expected = 'header.content.assets-single';

      expect(getHeaderLabel(data)).toEqual(expected);
    });

    it('should return the header translation with this multiple suffix if there is more than 1 element', () => {
      const data = ['test', 'test2'];
      const expected = 'header.content.assets-multiple';

      expect(getHeaderLabel(data)).toEqual(expected);
    });
  });
});
