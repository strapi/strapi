import { communityLicenseLimits } from '@tests/mockData';
import { render, screen, waitFor } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../ee/admin/src/hooks/useLicenseLimits';
import { FreeTrialWelcomeModal } from '../FreeTrialWelcomeModal';

jest.mock('../../../../services/admin', () => ({
  useInitQuery: jest.fn(() => ({
    data: {
      uuid: 'test-uuid',
    },
  })),
}));

jest.mock('../../../../../../ee/admin/src/hooks/useLicenseLimits', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: {
      isTrial: true,
    },
  })),
}));

describe('FreeTrialWelcomeModal', () => {
  it('should render when license is trial', async () => {
    render(<FreeTrialWelcomeModal />);

    await waitFor(() => {
      expect(screen.getByText("We're glad to have you on board")).toBeInTheDocument();
    });
  });

  it('should not render when license is not trial', async () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    render(<FreeTrialWelcomeModal />);

    await waitFor(() => {
      expect(screen.queryByText("We're glad to have you on board")).not.toBeInTheDocument();
    });
  });

  it.each([
    ['no license', undefined],
    ['the Community license limits', communityLicenseLimits],
  ])('should not render with %s', async (_label, license) => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({ license }));

    render(<FreeTrialWelcomeModal />);

    await waitFor(() => {
      expect(screen.queryByText("We're glad to have you on board")).not.toBeInTheDocument();
    });
  });
});
