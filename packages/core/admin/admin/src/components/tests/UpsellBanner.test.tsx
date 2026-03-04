import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { render, screen } from '@tests/utils';

import { useGetLicenseTrialTimeLeftQuery } from '../../../src/services/admin';
import { UpsellBanner } from '../UpsellBanner';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: {
      isTrial: true,
    },
  })),
}));

jest.mock('../../../src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({
    data: {
      trialEndsAt: '2025-05-15T00:00:00.000Z',
    },
  })),
  useInitQuery: jest.fn(() => ({
    data: {
      uuid: 'test-uuid',
    },
  })),
}));

describe('UpsellBanner', () => {
  beforeEach(() => {
    localStorage.removeItem('STRAPI_FREE_TRIAL_ENDS_AT:test-uuid');
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render when license is trial', () => {
    jest.setSystemTime(new Date(2025, 4, 10));

    render(<UpsellBanner />);

    expect(screen.getByText('Access to Growth plan features:')).toBeInTheDocument();
    expect(
      screen.getByText(
        'As part of your trial, you can explore premium tools such as Content History, Releases, and Single Sign-On (SSO).'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade now' })).toHaveAttribute(
      'href',
      'https://strapi.chargebeeportal.com'
    );
    expect(screen.getByRole('link', { name: 'Upgrade now' })).toHaveAttribute('target', '_blank');
  });

  it('should not render when license is not trial', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    // @ts-expect-error – mock
    useGetLicenseTrialTimeLeftQuery.mockImplementationOnce(() => ({
      data: {},
    }));

    render(<UpsellBanner />);

    expect(screen.queryByText('Access to Growth plan features:')).not.toBeInTheDocument();
  });

  it('should render when license trial ended less than 7 days ago', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    // @ts-expect-error – mock
    useGetLicenseTrialTimeLeftQuery.mockImplementationOnce(() => ({
      data: {},
    }));

    localStorage.setItem('STRAPI_FREE_TRIAL_ENDS_AT:test-uuid', '2025-05-21T09:50:00.000Z');
    jest.setSystemTime(new Date(2025, 4, 22));

    render(<UpsellBanner />);

    expect(screen.getByText('Your trial has ended:')).toBeInTheDocument();
    expect(
      screen.getByText('Keep access to Growth features by upgrading now.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keep Growth plan' })).toHaveAttribute(
      'href',
      'https://strapi.chargebeeportal.com'
    );
    expect(screen.getByRole('link', { name: 'Keep Growth plan' })).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  it('should not render when license trial ended more than 7 days ago', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    // @ts-expect-error – mock
    useGetLicenseTrialTimeLeftQuery.mockImplementationOnce(() => ({
      data: {},
    }));

    localStorage.setItem('STRAPI_FREE_TRIAL_ENDS_AT:test-uuid', '2025-05-10T09:50:00.000Z');
    jest.setSystemTime(new Date(2025, 4, 22));

    render(<UpsellBanner />);

    expect(screen.queryByText('Your trial has ended:')).not.toBeInTheDocument();
  });
});
