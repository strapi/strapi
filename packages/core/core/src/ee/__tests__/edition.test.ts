import { getEdition } from '../edition';

describe('getEdition', () => {
  it.each([false, undefined])('is Community when EE is %p', (EE) => {
    expect(getEdition({ EE, ee: { planPriceId: 'growth-monthly' } as never })).toBe('Community');
  });

  it.each(['growth-monthly', 'price_Growth_Yearly', 'GROWTH'])(
    'is Growth when the plan price id is %s',
    (planPriceId) => {
      expect(getEdition({ EE: true, ee: { planPriceId } as never })).toBe('Growth');
    }
  );

  it.each([undefined, null, 'enterprise-yearly', 'pro-monthly'])(
    'is Enterprise when the plan price id is %p',
    (planPriceId) => {
      expect(getEdition({ EE: true, ee: { planPriceId } as never })).toBe('Enterprise');
    }
  );
});
