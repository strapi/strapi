import { parseDateValue } from '../parseDateValue';

describe('parseDateValue', () => {
  it('should return undefined for null, undefined', () => {
    expect(parseDateValue(null)).toBeUndefined();
    expect(parseDateValue(undefined)).toBeUndefined();
  });

  it('should return a valid Date object for Date input', () => {
    const testDate = new Date('2024-09-04');
    expect(parseDateValue(testDate)).toEqual(testDate);
  });

  it('should return undefined for invalid Date object', () => {
    expect(parseDateValue(new Date('Invalid Date'))).toBeUndefined();
  });

  it('should return a Date object for valid string date input', () => {
    const result = parseDateValue('2024-09-04');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-09-04T00:00:00.000Z');
  });

  it('should return a Date object for valid number (timestamp) input', () => {
    const timestamp = 1725433710049;
    const result = parseDateValue(timestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-09-04T07:08:30.049Z');
  });

  it('should return undefined for invalid string date', () => {
    expect(parseDateValue('not-a-date')).toBeUndefined();
  });

  it('should return undefined for invalid number date', () => {
    expect(parseDateValue(NaN)).toBeUndefined();
  });

  it('should return undefined for unexpected types', () => {
    expect(parseDateValue({} as any)).toBeUndefined();
  });
});
