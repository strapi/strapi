import { render, screen } from '@tests/utils';

import { PlanCard } from '../PlanCard';

jest.mock(
  '../../../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/LicenseInfo',
  () => ({
    LicenseInfoEE: () => <div>ee license body</div>,
  })
);

type LicenseStatus = 'none' | 'active' | 'expired' | 'unknown';

interface MockLicenseLimitsQueryResult {
  data: { data: { licenseStatus: LicenseStatus; planPriceId: string | null } } | undefined;
}

/**
 * `PlanCard` reads the licence state from the authenticated `getLicenseLimits` query rather than
 * `window.strapi`, so a CE instance (where `/admin/license-limit-information` 404s, since the
 * route is EE-only) is modelled here as `data: undefined` - exactly what the query returns on
 * that 404.
 */
let mockQueryResult: MockLicenseLimitsQueryResult = { data: undefined };

jest.mock('../../../../../../services/admin', () => ({
  useGetLicenseLimitsQuery: () => mockQueryResult,
}));

const setLicenseLimits = (licenseStatus?: LicenseStatus, planPriceId: string | null = null) => {
  mockQueryResult = licenseStatus
    ? { data: { data: { licenseStatus, planPriceId } } }
    : { data: undefined };
};

type StrapiFixture = Pick<Window['strapi'], 'isEE' | 'projectType'>;

/**
 * `window.strapi.*` is populated once at boot (`render.ts`) and read directly by `PlanCard`,
 * so each test sets the fixture it needs and everything is restored afterwards to avoid
 * bleeding into other test files.
 */
const setStrapiFixture = (fixture: StrapiFixture) => {
  window.strapi.isEE = fixture.isEE;
  window.strapi.projectType = fixture.projectType;
};

describe('PlanCard', () => {
  const original: StrapiFixture = {
    isEE: window.strapi.isEE,
    projectType: window.strapi.projectType,
  };

  afterEach(() => {
    setStrapiFixture(original);
    setLicenseLimits(undefined);
  });

  it('renders the CE body and "See all plans" when there is no license (CE)', async () => {
    setStrapiFixture({ isEE: false, projectType: 'Community' });
    setLicenseLimits(undefined);

    render(<PlanCard />);

    expect(await screen.findByText('Community')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see all plans/i })).toBeInTheDocument();
    expect(screen.queryByText('ee license body')).not.toBeInTheDocument();
  });

  it('loads the EE license body and shows "View subscription" for an expired, retained Enterprise license', async () => {
    setStrapiFixture({ isEE: false, projectType: 'Community' });
    setLicenseLimits('expired', 'enterprise-plan');

    render(<PlanCard />);

    expect(await screen.findByText('ee license body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view subscription/i })).toBeInTheDocument();
    // isEE stays false: this is display-only, not a feature unlock.
    expect(window.strapi.isEE).toBe(false);
  });
});
