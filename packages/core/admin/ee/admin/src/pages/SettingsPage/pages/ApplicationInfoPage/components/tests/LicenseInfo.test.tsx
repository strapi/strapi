import { render, screen } from '@tests/utils';

import { GetLicenseLimitInformation } from '../../../../../../../../../shared/contracts/admin';
import { LicenseInfoEE } from '../LicenseInfo';

type LicenseData = GetLicenseLimitInformation.Response['data'];

const baseLicense: LicenseData = {
  type: 'gold',
  isTrial: false,
  permittedSeats: 25,
  currentActiveUserCount: 8,
  enforcementUserCount: 8,
  seats: 25,
  subscriptionId: 'sub_123',
  expireAt: '2026-12-31T00:00:00.000Z',
  licenseMode: 'online',
  licenseStatus: 'active',
  // Deliberately not a Growth price id, so the derived plan resolves to "Enterprise" - the
  // Growth-specific layout (admin seats / AI usage) is covered by AdminSeatInfo/AIUsage's own
  // tests, not here.
  planPriceId: 'enterprise-plan',
  renewalDate: '2027-03-18T00:00:00.000Z',
  lastRegistrySyncAt: Date.UTC(2026, 0, 1, 10, 0, 0),
  nextRegistrySyncAt: null,
  usingCachedLicense: false,
  registrySyncError: null,
  features: [],
  entitlements: [],
  planEntitlements: [
    { feature: 'sso', available: true, limits: [] },
    {
      feature: 'audit-logs',
      available: true,
      // Kept under the existing 60-day threshold so this exercises the plain "days" bucket
      // of `formatDays` rather than the "~N months" bucket.
      limits: [{ key: 'retentionDays', unit: 'days', value: 30 }],
    },
  ],
  isHostedOnStrapiCloud: false,
  licenseLimitStatus: null,
  shouldNotify: false,
  shouldStopCreate: false,
};

// Absolute dates render as locale-independent `yyyy/mm/dd`; mirror that here rather than
// asserting a locale-formatted string.
const formatDate = (iso: string) => {
  const date = new Date(iso);

  return `${date.getFullYear()}/${`${date.getMonth() + 1}`.padStart(2, '0')}/${`${date.getDate()}`.padStart(2, '0')}`;
};

// Reassigned per-test (fresh deep copy) so mutating one test's fixture can never
// bleed into another test — see the `beforeEach` below.
let licenseData: LicenseData | null = baseLicense;
let isLoading = false;
let isError = false;

jest.mock('../../../../../../hooks/useLicenseLimits', () => ({
  useLicenseLimits: () => ({ license: licenseData, isLoading, isError }),
}));

jest.mock('../../../../../../../../../admin/src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({ data: undefined })),
}));

describe('LicenseInfoEE', () => {
  beforeEach(() => {
    licenseData = structuredClone(baseLicense);
    isLoading = false;
    isError = false;
  });

  it('renders the Active badge, the last check-in line, and entitlement rows with a tick and a limit', async () => {
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Last license validity check/)).toBeInTheDocument();
    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByText('30 days retention')).toBeInTheDocument();
  });

  it('shows "Enterprise - offline" as the current plan and a valid-until line for offline licenses', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseMode: 'offline' };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Enterprise - offline')).toBeInTheDocument();
    expect(
      screen.getByText(`License valid until ${formatDate(baseLicense.expireAt!)}`)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Last license validity check/)).not.toBeInTheDocument();
  });

  it('shows the Expired badge when licenseStatus is "expired"', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseStatus: 'expired' };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Expired')).toBeInTheDocument();
  });

  it('shows the retained plan as the current plan for an expired license, even though isEE is false', async () => {
    // Mirrors what the Plan card feeds this component once a license expires: `window.strapi.isEE`
    // stays false (this is display-only, not a feature unlock) while the plan name is derived
    // from the license's own `licenseStatus`/`planPriceId` - `licenseStatus: 'expired' !== 'none'`
    // is enough to resolve "Enterprise" here, independently of `isEE`.
    window.strapi.isEE = false;
    licenseData = { ...structuredClone(baseLicense), licenseStatus: 'expired' };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.queryByText('Community')).not.toBeInTheDocument();
    expect(window.strapi.isEE).toBe(false);
  });

  it('shows the Unknown badge when licenseStatus is "unknown"', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseStatus: 'unknown' };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Unknown')).toBeInTheDocument();
  });

  it('omits the renewal date row when renewalDate is null', async () => {
    licenseData = { ...structuredClone(baseLicense), renewalDate: null };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('renewal date')).not.toBeInTheDocument();
  });

  it('does not render the entitlements table when planEntitlements is empty', async () => {
    licenseData = { ...structuredClone(baseLicense), planEntitlements: [] };
    render(<LicenseInfoEE />);

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('plan entitlements')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a cross for a feature marked unavailable', async () => {
    licenseData = {
      ...structuredClone(baseLicense),
      planEntitlements: [{ feature: 'review-workflows', available: false, limits: [] }],
    };
    render(<LicenseInfoEE />);

    expect(await screen.findByLabelText('No')).toBeInTheDocument();
  });

  it('renders nothing when there is no license', () => {
    licenseData = null;
    render(<LicenseInfoEE />);

    expect(screen.queryByText('license status')).not.toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    isLoading = true;
    render(<LicenseInfoEE />);

    expect(screen.queryByText('license status')).not.toBeInTheDocument();
  });
});
