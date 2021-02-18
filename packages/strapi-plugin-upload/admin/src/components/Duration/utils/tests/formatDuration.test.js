import formatDuration from '../formatDuration';

describe('UPLOAD | components | VideoPreview | utils', () => {
  describe('formatDuration', () => {
    it('should return 00:08 if seconds is 8.973333', () => {
      const seconds = 8.973333;
      const expected = '00:08';

      expect(formatDuration(seconds)).toEqual(expected);
    });

    it('should return 00:37 if seconds is 37.605', () => {
      const seconds = 37.605;
      const expected = '00:37';

      expect(formatDuration(seconds)).toEqual(expected);
    });

    it('should return 00:00 if seconds is 0', () => {
      const seconds = 0;
      const expected = '00:00';

      expect(formatDuration(seconds)).toEqual(expected);
    });

    it('should return 00:00 if seconds is 4000', () => {
      const seconds = 4000;
      const expected = '01:06:40';

      expect(formatDuration(seconds)).toEqual(expected);
    });
  });
});
