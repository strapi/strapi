import formatBytes from '../formatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('formatBytes', () => {
    it('should return 0B', () => {
      expect(formatBytes(0)).toEqual('0B');
    });

    it('should return 900B if 0.9 bytes is passed', () => {
      expect(formatBytes(0.9)).toEqual('900B');
    });

    it("should return 1MB if '1024' Bytes is passed", () => {
      expect(formatBytes('1024')).toEqual('1MB');
    });

    it('should return 1MB if 1234 is passed', () => {
      expect(formatBytes(1234)).toEqual('1MB');
    });

    it('should return 1.23MB if 1234 Bytes is passed with 2 decimals', () => {
      expect(formatBytes(1234, 2)).toEqual('1.23MB');
    });

    it('should return 1.234MB if 1234 Bytes is passed with 3 decimals', () => {
      expect(formatBytes(1234, 3)).toEqual('1.234MB');
    });

    it('should return 1GB if 1100000 is passed', () => {
      expect(formatBytes(1100000, 0)).toEqual('1GB');
    });
  });
});
