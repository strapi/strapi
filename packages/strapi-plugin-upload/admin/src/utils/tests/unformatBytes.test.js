import unformatBytes from '../unformatBytes';

describe('UPLOAD | components | EditForm | utils', () => {
  describe('unformatBytes', () => {
    it('should return 1.024 if 1KB is passed', () => {
      expect(unformatBytes('1KB')).toEqual(1.024);
    });

    it('should return 10.24 if 10KB is passed', () => {
      expect(unformatBytes('10KB')).toEqual(10.24);
    });

    it('should return 1048.576 if 1MB is passed', () => {
      expect(unformatBytes('1MB')).toEqual(1048.576);
    });

    it('should return 20971.52 if 20MB is passed', () => {
      expect(unformatBytes('20MB')).toEqual(20971.52);
    });

    it('should return 1073741.824 if 1GB is passed', () => {
      expect(unformatBytes('1GB')).toEqual(1073741.824);
    });

    it('should return 107374182.4 if 100GB is passed', () => {
      expect(unformatBytes('100GB')).toEqual(107374182.4);
    });
  });
});
