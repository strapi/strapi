import { render, screen } from '@tests/utils';

import { GetLicenseLimitInformation } from '../../../../../../../../shared/contracts/admin';
import { LicenseDetailsPage } from '../LicenseDetailsPage';

const licenseData: GetLicenseLimitInformation.Response['data'] = {
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

jest.mock('../../../../../hooks/useLicenseLimits', () => ({
  useLicenseLimits: () => ({ license: licenseData, isLoading: false, isError: false }),
}));

describe('LicenseDetailsPage', () => {
  it('renders the entitlements table with the effective limit', async () => {
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
    expect(screen.getByText('sub_123')).toBeInTheDocument();
  });

  it('renders "Unlimited" when an entitlement value is null', async () => {
    licenseData.entitlements = [
      {
        feature: 'cms-content-releases',
        limits: [{ key: 'maximumReleases', unit: 'count', value: null }],
      },
    ];
    licenseData.features = [{ name: 'cms-content-releases' }];
    render(<LicenseDetailsPage />);
    expect(await screen.findByText('Unlimited')).toBeInTheDocument();
  });
});
