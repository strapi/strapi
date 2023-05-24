import { renderHook } from '@testing-library/react-hooks';
import useLicenseLimitNotification from '..';
import useLicenseLimits from '../../useLicenseLimits';

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

jest.mock('react-intl', () => {
  return {
    useIntl: jest.fn(() => ({
      formatMessage: jest.fn((options) => options.defaultMessage),
    })),
  };
});

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

jest.mock('../../useLicenseLimits', () => {
  return jest.fn(() => ({
    license: {
      data: baseLicenseInfo,
    },
  }));
});

describe('useLicenseLimitNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('should return if no license info is available', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        data: {},
      },
    }));

    renderHook(() => useLicenseLimitNotification());
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if permittedSeat info is missing', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        data: {
          ...baseLicenseInfo,
          permittedSeats: undefined,
        },
      },
    }));

    renderHook(() => useLicenseLimitNotification());
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification if status is not AT_LIMIT or OVER_LIMIT', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        data: {
          ...baseLicenseInfo,
          licenseLimitStatus: 'SOME_STRING',
        },
      },
    }));

    renderHook(() => useLicenseLimitNotification());
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should display a notification when license limit is over or at limit', () => {
    renderHook(() => useLicenseLimitNotification());
    expect(toggleNotification).toHaveBeenCalled();
  });

  it('should display a soft warning notification when license limit is at limit', () => {
    renderHook(() => useLicenseLimitNotification());

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'softWarning',
      message:
        "Add seats to {licenseLimitStatus, select, OVER_LIMIT {invite} other {re-enable}} Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title:
        '{licenseLimitStatus, select, OVER_LIMIT {Over} other {At}} seat limit ({enforcementUserCount}/{permittedSeats})',
      link: {
        url: 'https://strapi.io/billing/request-seats',
        label: '{isHostedOnStrapiCloud, select, true {ADD SEATS} other {CONTACT SALES}}',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });

  it('should display a warning notification when license limit is at limit', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        data: {
          ...baseLicenseInfo,
          licenseLimitStatus: 'OVER_LIMIT',
        },
      },
    }));

    renderHook(() => useLicenseLimitNotification());

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message:
        "Add seats to {licenseLimitStatus, select, OVER_LIMIT {invite} other {re-enable}} Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title:
        '{licenseLimitStatus, select, OVER_LIMIT {Over} other {At}} seat limit ({enforcementUserCount}/{permittedSeats})',
      link: {
        url: 'https://strapi.io/billing/request-seats',
        label: '{isHostedOnStrapiCloud, select, true {ADD SEATS} other {CONTACT SALES}}',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });

  it('should have cloud billing url if is hosted on strapi cloud', () => {
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        data: {
          ...baseLicenseInfo,
          isHostedOnStrapiCloud: true,
        },
      },
    }));

    renderHook(() => useLicenseLimitNotification());

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'softWarning',
      message:
        "Add seats to {licenseLimitStatus, select, OVER_LIMIT {invite} other {re-enable}} Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      title:
        '{licenseLimitStatus, select, OVER_LIMIT {Over} other {At}} seat limit ({enforcementUserCount}/{permittedSeats})',
      link: {
        url: 'https://cloud.strapi.io/profile/billing',
        label: '{isHostedOnStrapiCloud, select, true {ADD SEATS} other {CONTACT SALES}}',
      },
      blockTransition: true,
      onClose: expect.any(Function),
    });
  });
});
