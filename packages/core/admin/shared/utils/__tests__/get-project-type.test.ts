import { getLicensedPlan, getProjectType } from '../get-project-type';

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

describe('getLicensedPlan', () => {
  it('names the plan of a verified license in any licensed status', () => {
    for (const licenseStatus of ['active', 'expired', 'unknown'] as const) {
      expect(getLicensedPlan({ licenseStatus, type: 'gold', planPriceId: 'enterprise' })).toBe(
        'Enterprise'
      );
      expect(getLicensedPlan({ licenseStatus, type: 'gold', planPriceId: 'growth' })).toBe(
        'Growth'
      );
    }
  });

  it('stays Community when no plan type was ever verified', () => {
    // A corrupt license.txt sets "unknown" before any type is stored.
    expect(getLicensedPlan({ licenseStatus: 'unknown', type: null, planPriceId: null })).toBe(
      'Community'
    );
    expect(getLicensedPlan({ licenseStatus: 'expired', type: undefined })).toBe('Community');
  });

  it('stays Community when the status is none or missing, whatever the type says', () => {
    expect(getLicensedPlan({ licenseStatus: 'none', type: 'gold' })).toBe('Community');
    // A mixed-version install can omit the status entirely; that carries no license claim.
    expect(getLicensedPlan({ licenseStatus: undefined, type: 'gold' })).toBe('Community');
  });
});
