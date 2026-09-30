import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { communityLicenseLimits } from '@tests/mockData';
import { screen, render } from '@tests/utils';

import { useGetLicenseTrialTimeLeftQuery } from '../../../../src/services/admin';
import { TrialCountdown } from '../TrialCountdown';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: {
      isTrial: true,
    },
  })),
}));

jest.mock('../../../../src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({
    data: {
      trialEndsAt: '2025-05-15T00:00:00.000Z',
    },
  })),
}));

describe('TrialCountdown', () => {
  it('should not render when license is not trial', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    render(<TrialCountdown />);

    expect(screen.queryByTestId('trial-countdown')).not.toBeInTheDocument();
  });

  it('should render when license is trial', async () => {
    render(<TrialCountdown />);

    expect(screen.getByTestId('trial-countdown')).toBeInTheDocument();
  });

  it.each([
    ['no license', undefined],
    ['the Community license limits', communityLicenseLimits],
  ])('should not render with %s', (_label, license) => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({ license }));

    render(<TrialCountdown />);

    expect(useGetLicenseTrialTimeLeftQuery).toHaveBeenLastCalledWith(undefined, { skip: true });
    expect(screen.queryByTestId('trial-countdown')).not.toBeInTheDocument();
  });
});
