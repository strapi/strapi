import { initialState } from '@tests/store';
import { render, screen, waitFor } from '@tests/utils';

import { DebugDumpPage, ProtectedDebugDumpPage } from '../DebugDumpPage';

const trigger = jest
  .fn()
  .mockResolvedValue({ data: { dumpVersion: 1, strapi: { edition: 'CE' } } });

jest.mock('../../../../../services/admin', () => ({
  useLazyGetDebugDumpQuery: () => [trigger, { data: undefined, isFetching: false }],
}));

const generateDump = async (user: ReturnType<typeof render>['user']) => {
  const generateButton = await screen.findByRole('button', { name: /generate/i });
  await user.click(generateButton);
  await waitFor(() => expect(trigger).toHaveBeenCalled());
};

describe('DebugDumpPage', () => {
  it('renders and generates a dump on click', async () => {
    const { user } = render(<DebugDumpPage />);
    await generateDump(user);
    expect(await screen.findByRole('button', { name: /download/i })).toBeInTheDocument();

    const preview = await screen.findByRole('textbox', { name: /debug dump preview/i });
    expect(preview).toHaveValue(
      JSON.stringify({ dumpVersion: 1, strapi: { edition: 'CE' } }, null, 2)
    );
    expect(preview).toHaveAttribute('readonly');
  });

  it('notifies and shows no preview when generation fails', async () => {
    trigger.mockResolvedValueOnce({ error: { name: 'ApplicationError', message: 'boom' } });
    const { user } = render(<DebugDumpPage />);
    const button = await screen.findByRole('button', { name: /generate/i });
    await user.click(button);
    expect(await screen.findByText(/failed to generate/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });

  it('notifies on successful copy', async () => {
    const { user } = render(<DebugDumpPage />);
    await generateDump(user);

    const copyButton = await screen.findByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it('notifies when copying to the clipboard fails', async () => {
    const writeTextSpy = jest
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('denied'));

    const { user } = render(<DebugDumpPage />);
    await generateDump(user);

    const copyButton = await screen.findByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(await screen.findByText(/could not copy/i)).toBeInTheDocument();

    writeTextSpy.mockRestore();
  });

  it('creates and revokes an object url when downloading', async () => {
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { user } = render(<DebugDumpPage />);
    await generateDump(user);

    const downloadButton = await screen.findByRole('button', { name: /download/i });
    await user.click(downloadButton);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
  });

  it('shows the community support links by default (CE)', async () => {
    render(<DebugDumpPage />);

    expect(await screen.findByRole('link', { name: /discord/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
    expect(screen.getByRole('link', { name: /github discussions/i })).toHaveAttribute(
      'href',
      'https://github.com/strapi/strapi/discussions'
    );
    expect(screen.getByRole('link', { name: /github issues/i })).toHaveAttribute(
      'href',
      'https://github.com/strapi/strapi/issues'
    );
    expect(screen.queryByRole('link', { name: /strapi support/i })).not.toBeInTheDocument();
  });

  it('shows the Strapi Support links for EE (Growth/Enterprise)', async () => {
    const original = window.strapi.isEE;
    window.strapi.isEE = true;
    try {
      render(<DebugDumpPage />);

      expect(await screen.findByRole('link', { name: /strapi support/i })).toHaveAttribute(
        'href',
        'https://support.strapi.io'
      );
      expect(screen.getByRole('link', { name: /github issues/i })).toHaveAttribute(
        'href',
        'https://github.com/strapi/strapi/issues'
      );
      expect(screen.queryByRole('link', { name: /discord/i })).not.toBeInTheDocument();
    } finally {
      window.strapi.isEE = original;
    }
  });

  /**
   * Server-side gating (i.e. that the `/admin/debug-dump` route itself enforces
   * `admin::debug-dump.read`) is covered by `tests/api/core/admin/admin-debug-dump.test.api.ts`.
   * This test only asserts the client-side `Page.Protect` wiring renders the page when the
   * matching permission is present, so a regression in the permission plumbing is caught here too.
   */
  it('renders the page when the debug-dump permission is present', async () => {
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

    render(<ProtectedDebugDumpPage />, {
      providerOptions: {
        storeConfig: { preloadedState },
        permissions: [{ action: 'admin::debug-dump.read', subject: null }],
      },
    });

    expect(await screen.findByRole('button', { name: /generate/i })).toBeInTheDocument();
  });
});
