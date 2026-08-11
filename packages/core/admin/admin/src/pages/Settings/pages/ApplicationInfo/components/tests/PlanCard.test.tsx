import { render, screen } from '@tests/utils';

import { PlanCard } from '../PlanCard';

jest.mock(
  '../../../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/LicenseInfo',
  () => ({
    LicenseInfoEE: () => <div>ee license body</div>,
  })
);

type StrapiFixture = Pick<
  Window['strapi'],
  'isEE' | 'licenseStatus' | 'licensedPlan' | 'projectType'
>;

/**
 * `window.strapi.*` is populated once at boot (`render.ts`) and read directly by `PlanCard`,
 * so each test sets the fixture it needs and everything is restored afterwards to avoid
 * bleeding into other test files.
 */
const setStrapiFixture = (fixture: StrapiFixture) => {
  window.strapi.isEE = fixture.isEE;
  window.strapi.licenseStatus = fixture.licenseStatus;
  window.strapi.licensedPlan = fixture.licensedPlan;
  window.strapi.projectType = fixture.projectType;
};

describe('PlanCard', () => {
  const original: StrapiFixture = {
    isEE: window.strapi.isEE,
    licenseStatus: window.strapi.licenseStatus,
    licensedPlan: window.strapi.licensedPlan,
    projectType: window.strapi.projectType,
  };

  afterEach(() => {
    setStrapiFixture(original);
  });

  it('renders the CE body and "See all plans" when there is no license (CE)', async () => {
    setStrapiFixture({
      isEE: false,
      licenseStatus: 'none',
      licensedPlan: 'Community',
      projectType: 'Community',
    });

    render(<PlanCard />);

    expect(await screen.findByText('Community')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see all plans/i })).toBeInTheDocument();
    expect(screen.queryByText('ee license body')).not.toBeInTheDocument();
  });

  it('loads the EE license body and shows "View subscription" for an expired, retained Enterprise license', async () => {
    setStrapiFixture({
      isEE: false,
      licenseStatus: 'expired',
      licensedPlan: 'Enterprise',
      projectType: 'Community',
    });

    render(<PlanCard />);

    expect(await screen.findByText('ee license body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view subscription/i })).toBeInTheDocument();
    // isEE stays false: this is display-only, not a feature unlock.
    expect(window.strapi.isEE).toBe(false);
  });
});
