/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useLicenseLimitNotification } from '../useLicenseLimitNotification';
import { useLicenseLimits } from '../useLicenseLimits';

const baseLicenseInfo = {
  enforcementUserCount: 5,
  currentActiveUserCount: 5,
  permittedSeats: 5,
  shouldNotify: true,
  shouldStopCreate: true,
  licenseLimitStatus: 'AT_LIMIT',
  isHostedOnStrapiCloud: false,
  type: 'growth',
};

// TODO: refactor
jest.mock('react-router', () => {
  return {
    useLocation: jest.fn(() => ({
      pathname: '/',
    })),
  };
});

const toggleNotification = jest.fn();

jest.mock('../../../../../admin/src/features/Notifications', () => {
  return {
    ...jest.requireActual('../../../../../admin/src/features/Notifications'),
    useNotification: jest.fn(() => ({
      toggleNotification,
    })),
  };
});

jest.mock('../useLicenseLimits', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: baseLicenseInfo,
  })),
}));

const setup = () =>
  renderHook(() => useLicenseLimitNotification(), {
    wrapper({ children }) {
      return <IntlProvider locale="en">{children}</IntlProvider>;
    },
  });

describe('useLicenseLimitNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('should return if no license info is available', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {},
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if permittedSeat info is missing', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        permittedSeats: undefined,
      },
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if status is not OVER_LIMIT', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        licenseLimitStatus: 'SOME_STRING',
      },
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should display a danger notification when license limit is over the limit', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        enforcementUserCount: 6,
        licenseLimitStatus: 'OVER_LIMIT',
      },
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message:
        "Add seats to invite Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title: 'Over seat limit (6/5)',
      link: {
        url: 'https://strapi.io/billing/manage-seats',
        label: 'Manage seats',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });

  it('should have Contact sales url if is Gold license', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        licenseLimitStatus: 'OVER_LIMIT',
        type: 'gold',
      },
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message:
        "Add seats to invite Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title: 'Over seat limit (5/5)',
      link: {
        url: 'https://strapi.io/billing/request-seats',
        label: 'Contact sales',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });
});
