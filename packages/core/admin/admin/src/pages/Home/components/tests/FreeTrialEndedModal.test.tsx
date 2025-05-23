import { render, screen, waitFor } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../ee/admin/src/hooks/useLicenseLimits';
import { useGetLicenseTrialTimeLeftQuery } from '../../../../../src/services/admin';
import { FreeTrialEndedModal } from '../FreeTrialEndedModal';

jest.mock('../../../../../../ee/admin/src/hooks/useLicenseLimits', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: {
      isTrial: true,
    },
  })),
}));

jest.mock('../../../../../src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({
    data: {
      trialEndsAt: '2025-05-15T00:00:00.000Z',
    },
  })),
}));

describe('FreeTrialEndedModal', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 4, 22));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render when license is trial and trial ended', async () => {
    render(<FreeTrialEndedModal />);

    await waitFor(() => {
      expect(screen.getByText('Your trial has ended')).toBeInTheDocument();
    });
  });

  it('should not render when license is not trial', async () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    render(<FreeTrialEndedModal />);

    expect(screen.queryByText('Your trial has ended')).not.toBeInTheDocument();
  });

  it('should not render when trial is not ended', async () => {
    // @ts-expect-error – mock
    useGetLicenseTrialTimeLeftQuery.mockImplementationOnce(() => ({
      data: {
        trialEndsAt: '2025-05-25T00:00:00.000Z',
      },
    }));

    render(<FreeTrialEndedModal />);

    expect(screen.queryByText('Your trial has ended')).not.toBeInTheDocument();
  });
});
