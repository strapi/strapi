import * as z from 'zod/v4';
import { maybeWithMinMax } from '../validation/utilities';

describe('maybeWithMinMax', () => {
  it('should apply min and max when both are provided', () => {
    const schema = maybeWithMinMax(0, 10)(z.number());

    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(11).success).toBe(false);
    expect(schema.safeParse(5).success).toBe(true);
  });

  it('should apply min and max when min is negative', () => {
    const schema = maybeWithMinMax(-1, 10)(z.number());

    // This is the user's case: min -1, max 10. Value -15.
    // Should fail.
    expect(schema.safeParse(-15).success).toBe(false);
    expect(schema.safeParse(-2).success).toBe(false);
    expect(schema.safeParse(-1).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(10).success).toBe(true);
    expect(schema.safeParse(11).success).toBe(false);
  });

  it('should apply min if max is undefined', () => {
    const schema = maybeWithMinMax(0, undefined)(z.number());
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(1).success).toBe(true);
  });

  it('should apply max if min is undefined', () => {
    const schema = maybeWithMinMax(undefined, 10)(z.number());
    expect(schema.safeParse(11).success).toBe(false);
    expect(schema.safeParse(5).success).toBe(true);
  });
});
