/**
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "America/Los_Angeles"}}
 */
import { render, screen } from '@tests/utils';

import { GetLicenseLimitInformation } from '../../../../../../../../../shared/contracts/admin';
import { LicenseInfoEE } from '../LicenseInfo';

// Runs west of UTC, where local date getters turned a UTC-midnight expiry into the day before.
// Every other LicenseInfo test runs in the UTC pin, where that bug is invisible.

const license = {
  type: 'gold',
  isTrial: false,
  licenseMode: 'offline',
  licenseStatus: 'active',
  planPriceId: 'enterprise-plan',
  expireAt: '2026-12-31T00:00:00.000Z',
  renewalDate: null,
  subscriptionId: 'sub_123',
  lastRegistrySyncAt: null,
  usingCachedLicense: false,
  registrySyncError: null,
  registrySyncErrorKind: null,
  planEntitlements: [],
} as unknown as GetLicenseLimitInformation.Response['data'];

jest.mock('../../../../../../hooks/useLicenseLimits', () => ({
  useLicenseLimits: () => ({ license, isLoading: false, isError: false }),
}));

jest.mock('../AIUsage', () => ({
  AIUsage: () => null,
}));

jest.mock('../../../../../../../../../admin/src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({ data: undefined })),
}));

describe('LicenseInfoEE west of UTC', () => {
  it('shows a UTC-midnight expiry as the same calendar day', async () => {
    render(<LicenseInfoEE />);

    expect(await screen.findByText('License valid until 2026/12/31')).toBeInTheDocument();
  });
});
