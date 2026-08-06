import { fromDisk } from '../sources';
import { DISK_SOURCE, isDiskSource } from '../brand';

describe('fromDisk', () => {
  it('returns a branded disk source carrying the path', () => {
    const source = fromDisk('./config');

    expect(isDiskSource(source)).toBe(true);
    expect(source.path).toBe('./config');
    expect(source[DISK_SOURCE]).toBe(true);
  });

  it.each(['', '   ', undefined, null, 42, {}])('throws on invalid path %p', (value) => {
    expect(() => fromDisk(value as unknown as string)).toThrow(TypeError);
  });
});
