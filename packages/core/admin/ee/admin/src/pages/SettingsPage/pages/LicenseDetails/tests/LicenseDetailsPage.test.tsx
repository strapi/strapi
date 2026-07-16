import { render, screen } from '@tests/utils';

import { GetLicenseLimitInformation } from '../../../../../../../../shared/contracts/admin';
import { LicenseDetailsPage } from '../LicenseDetailsPage';

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
  features: [{ name: 'audit-logs', options: { retentionDays: 90 } }],
  entitlements: [
    { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
  ],
  isHostedOnStrapiCloud: false,
  licenseLimitStatus: null,
  shouldNotify: false,
  shouldStopCreate: false,
};

// Reassigned per-test (fresh deep copy) so mutating one test's fixture can never
// bleed into another test — see the `beforeEach` below.
let licenseData: GetLicenseLimitInformation.Response['data'] = baseLicense;

jest.mock('../../../../../hooks/useLicenseLimits', () => ({
  useLicenseLimits: () => ({ license: licenseData, isLoading: false, isError: false }),
}));

describe('LicenseDetailsPage', () => {
  beforeEach(() => {
    licenseData = structuredClone(baseLicense);
  });

  it('renders the entitlements table with a labeled, humanized limit', async () => {
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Audit Logs')).toBeInTheDocument();
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
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Releases: Unlimited')).toBeInTheDocument();
  });

  it('shows last/next check-in details when the license mode is online', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseMode: 'online' };
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Last check-in')).toBeInTheDocument();
    expect(screen.getByText('Next check-in')).toBeInTheDocument();
    expect(screen.queryByText('Expires')).not.toBeInTheDocument();
  });

  it('shows "Not yet" when the license has never synced with the registry', async () => {
    licenseData = {
      ...structuredClone(baseLicense),
      lastRegistrySyncAt: null,
      nextRegistrySyncAt: null,
    };
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Last check-in')).toBeInTheDocument();
    expect(screen.getAllByText('Not yet')).toHaveLength(2);
  });

  it('shows the real expiry date when the license mode is offline', async () => {
    licenseData = { ...structuredClone(baseLicense), licenseMode: 'offline' };
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Expires')).toBeInTheDocument();
    expect(screen.queryByText('Last check-in')).not.toBeInTheDocument();
    expect(screen.queryByText('Next check-in')).not.toBeInTheDocument();
  });
});
