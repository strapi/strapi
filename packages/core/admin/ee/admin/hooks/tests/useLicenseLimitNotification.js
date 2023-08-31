import React from 'react';

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
  licenseType: 'gold',
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

jest.mock('@strapi/helper-plugin', () => {
  return {
    useNotification: jest.fn(() => toggleNotification),
  };
});

jest.mock('../../useLicenseLimits', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: baseLicenseInfo,
  })),
}));

const setup = (...args) =>
  renderHook(() => useLicenseLimitNotification(...args), {
    wrapper({ children }) {
      return <IntlProvider>{children}</IntlProvider>;
    },
  });

describe('useLicenseLimitNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('should return if no license info is available', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {},
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if permittedSeat info is missing', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        permittedSeats: undefined,
      },
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if status is not AT_LIMIT or OVER_LIMIT', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        licenseLimitStatus: 'SOME_STRING',
      },
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should display a notification when license limit is over or at limit', () => {
    setup();
    expect(toggleNotification).toHaveBeenCalled();
  });

  it('should display a soft warning notification when license limit is at limit', () => {
    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'softWarning',
      message:
        "Add seats to re-enable Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title: 'At seat limit (5/5)',
      link: {
        url: 'https://strapi.io/billing/request-seats',
        label: 'CONTACT SALES',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });

  it('should display a warning notification when license limit is at limit', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        licenseLimitStatus: 'OVER_LIMIT',
      },
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message:
        "Add seats to invite Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title: 'Over seat limit (5/5)',
      link: {
        url: 'https://strapi.io/billing/request-seats',
        label: 'CONTACT SALES',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });

  it('should have cloud billing url if is hosted on strapi cloud', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        ...baseLicenseInfo,
        isHostedOnStrapiCloud: true,
      },
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'softWarning',
      message:
        "Add seats to re-enable Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title: 'At seat limit (5/5)',
      link: {
        url: 'https://cloud.strapi.io/profile/billing',
        label: 'ADD SEATS',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });
});
