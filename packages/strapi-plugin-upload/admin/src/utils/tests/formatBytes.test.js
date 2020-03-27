import formatBytes from '../formatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('formatBytes', () => {
    it('should return 0B', () => {
      expect(formatBytes(0)).toEqual('0B');
    });

    it('should return 0B if less than 1 bytes is passed', () => {
      expect(formatBytes(0.9)).toEqual('900B');
    });

    it('should return 1KB if 1024 Bytes is passed', () => {
      expect(formatBytes(1024)).toEqual('1000KB');
    });

    it("should return 1KB if '1024' Bytes is passed", () => {
      expect(formatBytes('1024')).toEqual('1000KB');
    });

    it('should return 1.21KB if 1034 Bytes is passed', () => {
      expect(formatBytes(1234)).toEqual('1.18MB');
    });

    it('should return 1.21KB if 1034 Bytes is passed with 3 decimals', () => {
      expect(formatBytes(1234, 3)).toEqual('1.177MB');
    });

    it('should return 1 MB if 1.1e+6 Bytes is passed', () => {
      expect(formatBytes(1100000, 0)).toEqual('1GB');
    });
  });
});
