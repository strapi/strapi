import formatBytes from '../formatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('formatBytes', () => {
    it('should return 0 Bytes', () => {
      expect(formatBytes(0)).toEqual('0 Bytes');
    });

    it('should return 1KB if 1024 Bytes is passed', () => {
      expect(formatBytes(1024)).toEqual('1 KB');
    });

    it("should return 1KB if '1024' Bytes is passed", () => {
      expect(formatBytes('1024')).toEqual('1 KB');
    });

    it('should return 1.21KB if 1034 Bytes is passed', () => {
      expect(formatBytes(1234)).toEqual('1.21 KB');
    });

    it('should return 1.21KB if 1034 Bytes is passed with 3 decimals', () => {
      expect(formatBytes(1234, 3)).toEqual('1.205 KB');
    });

    it('should return 1 MB if 1.1e+6 Bytes is passed', () => {
      expect(formatBytes(1100000, 0)).toEqual('1 MB');
    });
  });
});
