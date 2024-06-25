import { getTimezoneOffset } from '../time';

describe('getTimezoneOffset', () => {
  it('should return correct offset for UTC timezone', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('UTC', date);
    expect(offset).toBe('UTC+00:00');
  });

  it('should return correct offset for timezone without daylight', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('Europe/Paris', date);
    expect(offset).toBe('UTC+01:00');
  });

  it('should return correct offset for timezone with daylight', () => {
    const date = new Date('2024-06-06T00:00:00Z');
    const offset = getTimezoneOffset('Europe/Paris', date);
    expect(offset).toBe('UTC+02:00');
  });

  it('should return empty string for invalid timezone', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const offset = getTimezoneOffset('Invalid/Timezone', date);
    expect(offset).toBe('');
  });
});
