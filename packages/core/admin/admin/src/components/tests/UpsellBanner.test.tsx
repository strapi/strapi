import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { render, screen } from '@tests/utils';

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
}));

describe('UpsellBanner', () => {
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

  it('should render when license is trial but ended', () => {
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

  it('should not render when license is not trial', () => {
    // @ts-expect-error – mock
    useLicenseLimits.mockImplementationOnce(() => ({
      license: {
        isTrial: false,
      },
    }));

    render(<UpsellBanner />);

    expect(screen.queryByText('Access to Growth plan features:')).not.toBeInTheDocument();
  });
});
