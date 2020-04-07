import formatBytes from '../formatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('formatBytes', () => {
    it('should return 0B', () => {
      expect(formatBytes(0)).toEqual('0B');
    });

    it('should return 900B if 0.9 bytes is passed', () => {
      expect(formatBytes(0.9)).toEqual('900B');
    });

    it("should return 1KB if '1024' Bytes is passed", () => {
      expect(formatBytes('1024')).toEqual('1MB');
    });

    it('should return 1.18MB if 1034 Bytes is passed', () => {
      expect(formatBytes(1234)).toEqual('1MB');
    });

    it('should return 1.18MB if 1034 Bytes is passed', () => {
      expect(formatBytes(1234, 2)).toEqual('1.23MB');
    });

    it('should return 1.177MB if 1234 Bytes is passed with 3 decimals', () => {
      expect(formatBytes(1234, 3)).toEqual('1.234MB');
    });

    it('should return 1 GB if 1.1e+6 Bytes is passed', () => {
      expect(formatBytes(1100000, 0)).toEqual('1GB');
    });
  });
});
