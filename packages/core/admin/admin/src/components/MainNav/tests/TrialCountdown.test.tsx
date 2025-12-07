import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { screen, render } from '@tests/utils';

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
});
