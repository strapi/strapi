import { initialState } from '@tests/store';
import { render, screen } from '@tests/utils';

import { SupportCard } from '../SupportCard';

const trigger = jest.fn().mockResolvedValue({ data: undefined });

jest.mock('../../../../../../services/admin', () => ({
  useLazyGetDebugDumpQuery: () => [trigger, { data: undefined, isFetching: false, isError: false }],
}));

/**
 * `admin::debug-dump.read` is not part of the default test fixtures (it isn't for the standalone
 * DebugDump page either), so we wire the permission into both the redux state the card reads from
 * and the auth permissions `useRBAC` checks against.
 */
const withDebugDumpPermission = () => {
  const preloadedState = initialState();
  preloadedState.admin_app.permissions = {
    ...preloadedState.admin_app.permissions,
    settings: {
      ...preloadedState.admin_app.permissions.settings,
      'debug-dump': {
        main: [{ action: 'admin::debug-dump.read', subject: null }],
        read: [{ action: 'admin::debug-dump.read', subject: null }],
      },
    },
  };

  return {
    storeConfig: { preloadedState },
    permissions: [{ action: 'admin::debug-dump.read', subject: null }],
  };
};

describe('SupportCard', () => {
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

  it('renders the Support portal tile and not GitHub discussions on EE', async () => {
    const original = window.strapi.isEE;
    window.strapi.isEE = true;

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
