import { render, screen } from '@tests/utils';

import { GetLicenseLimitInformation } from '../../../../../../../../../shared/contracts/admin';
import { LicenseInfoEE } from '../LicenseInfo';

const baseLicense: GetLicenseLimitInformation.Response['data'] = {
  type: 'gold',
  isTrial: false,
  permittedSeats: 25,
  currentActiveUserCount: 8,
  enforcementUserCount: 8,
  seats: 25,
  subscriptionId: 'sub_123',
  expireAt: '2026-12-31T00:00:00.000Z',
  licenseMode: 'online' as const,
  lastRegistrySyncAt: 1700000000000,
  nextRegistrySyncAt: 1700043200000,
  usingCachedLicense: false,
  registrySyncError: null,
  features: [
    { name: 'review-workflows', options: { numberOfWorkflows: 5, stagesPerWorkflow: 3 } },
    { name: 'audit-logs', options: { retentionDays: 90 } },
  ],
  entitlements: [
    {
      feature: 'review-workflows',
      limits: [{ key: 'numberOfWorkflows', unit: 'count', value: 5 }],
    },
    { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
  ],
  isHostedOnStrapiCloud: false,
  licenseLimitStatus: null,
  shouldNotify: false,
  shouldStopCreate: false,
};

// Reassigned per-test (fresh deep copy) so mutating one test's fixture can never
// bleed into another test — see the `beforeEach` below.
let licenseData: GetLicenseLimitInformation.Response['data'] | null = baseLicense;
let isLoading = false;
let isError = false;

jest.mock('../../../../../../hooks/useLicenseLimits', () => ({
  useLicenseLimits: () => ({ license: licenseData, isLoading, isError }),
}));

describe('LicenseInfoEE', () => {
  beforeEach(() => {
    licenseData = structuredClone(baseLicense);
    isLoading = false;
    isError = false;
  });

  it('renders the entitlements table with labeled, humanized limits', async () => {
    render(<LicenseInfoEE />);
    expect(await screen.findByText('Workflows: 5')).toBeInTheDocument();
    expect(screen.getByText('Retention: ~3 months')).toBeInTheDocument();
    expect(screen.getByText('sub_123')).toBeInTheDocument();
  });

  it('renders "Unlimited" when an entitlement value is null', async () => {
    licenseData = {
      ...structuredClone(baseLicense),
      entitlements: [
        {
          feature: 'cms-content-releases',
          limits: [{ key: 'maximumReleases', unit: 'count', value: null }],
        },
      ],
      features: [{ name: 'cms-content-releases' }],
    };
    render(<LicenseInfoEE />);
    expect(await screen.findByText('Releases: Unlimited')).toBeInTheDocument();
  });

  it('shows last/next check-in details when the license mode is online', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseMode: 'online' };
    render(<LicenseInfoEE />);
    expect(await screen.findByText('Last check-in')).toBeInTheDocument();
    expect(screen.getByText('Next check-in')).toBeInTheDocument();
    expect(screen.queryByText('Expires')).not.toBeInTheDocument();
  });

  it('shows the real expiry date when the license mode is offline', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseMode: 'offline' };
    render(<LicenseInfoEE />);
    expect(await screen.findByText('Expires')).toBeInTheDocument();
    expect(screen.queryByText('Last check-in')).not.toBeInTheDocument();
    expect(screen.queryByText('Next check-in')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no license', () => {
    licenseData = null;
    render(<LicenseInfoEE />);
    expect(screen.queryByText('License')).not.toBeInTheDocument();
    expect(screen.queryByText('Entitlements')).not.toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    isLoading = true;
    render(<LicenseInfoEE />);
    expect(screen.queryByText('License')).not.toBeInTheDocument();
    expect(screen.queryByText('Entitlements')).not.toBeInTheDocument();
  });
});
