import unformatBytes from '../unformatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('unformatBytes', () => {
    it('should return 1 if 1KB is passed', () => {
      expect(unformatBytes('1KB')).toEqual(1);
    });

    it('should return 10 if 10KB is passed', () => {
      expect(unformatBytes('10KB')).toEqual(10);
    });

    it('should return 1000 if 1MB is passed', () => {
      expect(unformatBytes('1MB')).toEqual(1000);
    });

    it('should return 20000 if 20MB is passed', () => {
      expect(unformatBytes('20MB')).toEqual(20000);
    });

    it('should return 1000000 if 1GB is passed', () => {
      expect(unformatBytes('1GB')).toEqual(1000000);
    });

    it('should return 100000000 if 100GB is passed', () => {
      expect(unformatBytes('100GB')).toEqual(100000000);
    });
  });
});
