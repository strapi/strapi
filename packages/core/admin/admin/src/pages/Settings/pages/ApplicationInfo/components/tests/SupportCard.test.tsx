import { initialState } from '@tests/store';
import { render, screen } from '@tests/utils';

import { SupportCard } from '../SupportCard';

type LicenseStatus = 'none' | 'active' | 'expired' | 'unknown';

interface MockLicenseLimitsQueryResult {
  data: { data: { licenseStatus: LicenseStatus; planPriceId: string | null } } | undefined;
}

/**
 * `SupportCard` reads the licensed plan from the authenticated `getLicenseLimits` query rather
 * than `window.strapi`, so a CE instance (where `/admin/license-limit-information` 404s, since
 * the route is EE-only) is modelled here as `data: undefined` - exactly what the query returns
 * on that 404.
 */
let mockLicenseLimitsResult: MockLicenseLimitsQueryResult = { data: undefined };

const setLicenseLimits = (licenseStatus?: LicenseStatus, planPriceId: string | null = null) => {
  mockLicenseLimitsResult = licenseStatus
    ? { data: { data: { licenseStatus, planPriceId } } }
    : { data: undefined };
};

const trigger = jest.fn().mockResolvedValue({ data: undefined });

jest.mock('../../../../../../services/admin', () => ({
  useLazyGetDebugDumpQuery: () => [trigger, { data: undefined, isFetching: false, isError: false }],
  useGetLicenseLimitsQuery: () => mockLicenseLimitsResult,
}));

/**
 * `admin::debug-dump.read` is not part of the default test fixtures (it isn't for the standalone
 * DebugDump page either), so we wire the permission into both the redux state the card reads from
 * and the auth permissions `useRBAC` checks against.
 */
const withDebugDumpPermission = () => {
  const preloadedState = initialState();
  // `initialState()` infers `settings` from the literal it ships, which has no `debug-dump`
  // key, so the spread needs the cast. The key IS part of `PermissionMap['settings']`
  // (admin/src/types/permissions.ts), which is what the reducer and the card actually use.
  preloadedState.admin_app.permissions = {
    ...preloadedState.admin_app.permissions,
    settings: {
      ...preloadedState.admin_app.permissions.settings,
      'debug-dump': {
        main: [{ action: 'admin::debug-dump.read', subject: null }],
        read: [{ action: 'admin::debug-dump.read', subject: null }],
      },
    } as typeof preloadedState.admin_app.permissions.settings,
  };

  return {
    storeConfig: { preloadedState },
    permissions: [{ action: 'admin::debug-dump.read', subject: null }],
  };
};

describe('SupportCard', () => {
  afterEach(() => {
    setLicenseLimits(undefined);
  });

  it('renders the CE tiles and not the Support portal tile', async () => {
    render(<SupportCard />);

    expect(await screen.findByRole('link', { name: /documentation/i })).toHaveAttribute(
      'href',
      'https://docs.strapi.io'
    );
    expect(screen.getByRole('link', { name: /github issues/i })).toHaveAttribute(
      'href',
      'https://github.com/strapi/strapi/issues'
    );
    expect(screen.getByRole('link', { name: /github discussions/i })).toHaveAttribute(
      'href',
      'https://github.com/strapi/strapi/discussions'
    );
    expect(screen.getByRole('link', { name: /discord/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
    expect(screen.queryByRole('link', { name: /support portal/i })).not.toBeInTheDocument();
  });

  it('renders the Support portal tile and not GitHub discussions on a paid plan', async () => {
    const original = window.strapi.isEE;
    window.strapi.isEE = true;
    setLicenseLimits('active', 'enterprise-plan');

    try {
      render(<SupportCard />);

      expect(await screen.findByRole('link', { name: /support portal/i })).toHaveAttribute(
        'href',
        'https://support.strapi.io'
      );
      expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute(
        'href',
        'https://docs.strapi.io'
      );
      expect(screen.getByRole('link', { name: /github issues/i })).toHaveAttribute(
        'href',
        'https://github.com/strapi/strapi/issues'
      );
      expect(screen.getByRole('link', { name: /discord/i })).toHaveAttribute(
        'href',
        'https://discord.strapi.io'
      );
      expect(screen.queryByRole('link', { name: /github discussions/i })).not.toBeInTheDocument();
    } finally {
      window.strapi.isEE = original;
    }
  });

  it('keeps the Support portal tile for a lapsed paid plan, even though isEE is false', async () => {
    // A customer whose license expired still needs to reach Strapi support, so the tiles follow
    // the licensed plan rather than isEE. This swaps links only; it unlocks nothing.
    const original = window.strapi.isEE;
    window.strapi.isEE = false;
    setLicenseLimits('expired', 'enterprise-plan');

    try {
      render(<SupportCard />);

      expect(await screen.findByRole('link', { name: /support portal/i })).toBeInTheDocument();
      expect(window.strapi.isEE).toBe(false);
    } finally {
      window.strapi.isEE = original;
    }
  });

  it('hides the diagnostic snapshot column without the debug-dump permission', async () => {
    render(<SupportCard />);

    expect(await screen.findByRole('link', { name: /documentation/i })).toBeInTheDocument();
    expect(screen.queryByText(/diagnostic snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate snapshot/i })).not.toBeInTheDocument();
  });

  it('shows the diagnostic snapshot column with the debug-dump permission', async () => {
    render(<SupportCard />, { providerOptions: withDebugDumpPermission() });

    expect(await screen.findByRole('button', { name: /generate snapshot/i })).toBeInTheDocument();
    expect(screen.getByText(/diagnostic snapshot/i)).toBeInTheDocument();
  });

  it('opens the diagnostic snapshot modal when clicking "Generate snapshot"', async () => {
    const { user } = render(<SupportCard />, { providerOptions: withDebugDumpPermission() });

    const generateButton = await screen.findByRole('button', { name: /generate snapshot/i });
    await user.click(generateButton);

    expect(
      await screen.findByRole('heading', { name: /diagnostic snapshot/i })
    ).toBeInTheDocument();
  });
});
