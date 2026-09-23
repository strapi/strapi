import { getProjectType } from '../getProjectType';

describe('getProjectType', () => {
  it('returns "Community" when there is no license', () => {
    expect(getProjectType({ isEE: false })).toBe('Community');
    expect(getProjectType({ isEE: false, planPriceId: 'growth_monthly' })).toBe('Community');
  });

  it('returns "Growth" when the plan price id contains "growth" (case-insensitive)', () => {
    expect(getProjectType({ isEE: true, planPriceId: 'growth' })).toBe('Growth');
    expect(getProjectType({ isEE: true, planPriceId: 'Growth_Monthly' })).toBe('Growth');
    expect(getProjectType({ isEE: true, planPriceId: 'cms-growth-yearly' })).toBe('Growth');
  });

  it('returns "Enterprise" for any other licensed plan', () => {
    expect(getProjectType({ isEE: true })).toBe('Enterprise');
    expect(getProjectType({ isEE: true, planPriceId: 'enterprise_monthly' })).toBe('Enterprise');
    expect(getProjectType({ isEE: true, planPriceId: 'scale_yearly' })).toBe('Enterprise');
  });
});
