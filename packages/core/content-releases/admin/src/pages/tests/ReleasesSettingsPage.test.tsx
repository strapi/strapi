import { useRBAC } from '@strapi/admin/strapi-admin';
import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleasesSettingsPage, ProtectedReleasesSettingsPage } from '../ReleasesSettingsPage';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canRead: false, canUpdate: false },
  })),
}));

describe('Releases Settings page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the no permissions content if you do not have read permission', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canRead: false, canUpdate: false },
    }));

    render(<ProtectedReleasesSettingsPage />);

    expect(
      screen.getByText("You don't have the permissions to access that content")
    ).toBeInTheDocument();
  });

  it('renders the settings page with read permission', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canRead: true, canUpdate: false },
    }));
    server.use(
      rest.get('/content-releases/settings', (req, res, ctx) =>
        res(
          ctx.json({
            data: {
              defaultTimezone: null,
            },
          })
        )
      )
    );

    render(<ReleasesSettingsPage />);

    const title = await screen.findByRole('heading', { name: 'Releases' });
    expect(title).toBeInTheDocument();

    const saveButton = screen.queryByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeInTheDocument();

    const defaultTimezoneCombobox = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(defaultTimezoneCombobox).toBeDisabled();
  });

  it('renders the settings page with read and update permissions', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canRead: true, canUpdate: true },
    }));
    server.use(
      rest.get('/content-releases/settings', (req, res, ctx) =>
        res(
          ctx.json({
            data: {
              defaultTimezone: '',
            },
          })
        )
      )
    );

    render(<ReleasesSettingsPage />);

    const title = await screen.findByRole('heading', { name: 'Releases' });
    expect(title).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeInTheDocument();

    const defaultTimezoneCombobox = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(defaultTimezoneCombobox).toBeEnabled();
  });
});
