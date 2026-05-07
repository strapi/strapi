import { useRBAC } from '@strapi/admin/strapi-admin';
import { render, server, screen, waitFor, fireEvent } from '@tests/utils';
import { rest } from 'msw';

import { ProtectedReleasesSettingsPage } from '../ReleasesSettingsPage';

interface ReleaseSettings {
  data: {
    data: {
      defaultTimezone: string | null;
    };
  };
  isLoading: boolean;
}

const permissions = {
  read: { action: 'plugin::content-releases.settings.read', subject: null },
  update: { action: 'plugin::content-releases.settings.update', subject: null },
};

const mockUseGetReleaseSettingsQuery = jest.fn<ReleaseSettings, []>(() => ({
  data: { data: { defaultTimezone: null } },
  isLoading: false,
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canRead: false, canUpdate: false },
  })),
}));

jest.mock('../../modules/hooks', () => {
  const original = jest.requireActual('../../modules/hooks');
  return {
    ...original,
    useTypedSelector: jest.fn(() => []),
  };
});

jest.mock('../../services/release', () => ({
  ...jest.requireActual('../../services/release'),
  useGetReleaseSettingsQuery: () => mockUseGetReleaseSettingsQuery(),
}));

jest.mock('../../utils/time', () => ({
  getTimezones: jest.fn(() => ({
    timezoneList: [{ value: 'UTC+02:00&Europe/Paris' }, { value: 'UTC+02:00&Europe/Madrid' }],
  })),
}));

const setupPermissions = (canRead: boolean, canUpdate: boolean) => {
  // @ts-expect-error – mocking
  useRBAC.mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canRead, canUpdate },
  }));
  const permissionsAllowed: Array<{ action: string; subject: null }> = [];
  if (canRead) {
    permissionsAllowed.push(permissions.read);
  }
  if (canUpdate) {
    permissionsAllowed.push(permissions.update);
  }
  jest.requireMock('../../modules/hooks').useTypedSelector.mockReturnValue(permissionsAllowed);
};

const setupGetSettingsResponse = (defaultTimezone: string | null) => {
  mockUseGetReleaseSettingsQuery.mockReturnValue({
    data: { data: { defaultTimezone } },
    isLoading: false,
  });
};

const setupUpdateSettingsResponse = (putMock: jest.Mock, responseTimezone: string | null) => {
  server.use(
    rest.put('/content-releases/settings', async (req, res, ctx) => {
      putMock(await req.json());
      return res(
        ctx.json({
          data: {
            defaultTimezone: responseTimezone,
          },
        })
      );
    })
  );
};

describe('Releases Settings page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the no permissions content if you do not have read permission', () => {
    setupPermissions(false, false);
    render(<ProtectedReleasesSettingsPage />);

    expect(
      screen.getByText("You don't have the permissions to access that content")
    ).toBeInTheDocument();
  });

  it('renders the settings page with read permission', () => {
    setupPermissions(true, false);
    setupGetSettingsResponse(null);

    render(<ProtectedReleasesSettingsPage />);

    const title = screen.getByRole('heading', { name: 'Releases' });
    expect(title).toBeInTheDocument();

    const saveButton = screen.queryByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeInTheDocument();

    const defaultTimezoneCombobox = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(defaultTimezoneCombobox).toBeDisabled();
  });

  it('renders the settings page with read and update permissions', () => {
    setupPermissions(true, true);
    setupGetSettingsResponse('');

    render(<ProtectedReleasesSettingsPage />);

    const title = screen.getByRole('heading', { name: 'Releases' });
    expect(title).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeInTheDocument();

    const defaultTimezoneCombobox = screen.getByRole('combobox', { name: 'Default timezone' });
    expect(defaultTimezoneCombobox).toBeEnabled();
  });

  it('should save a valid timezone value when form submitted', async () => {
    const putMock = jest.fn();
    setupPermissions(true, true);
    setupGetSettingsResponse('');
    setupUpdateSettingsResponse(putMock, 'UTC+02:00&Europe/Paris');

    const { user } = render(<ProtectedReleasesSettingsPage />);

    // Wait for the combobox to be rendered
    const combobox = await screen.findByRole('combobox', { name: 'Default timezone' });
    await user.click(combobox);
    await user.type(combobox, 'UTC+02:00 Europe/Paris');
    await user.keyboard('{Enter}');

    // Save the new default timezone value
    const saveButton = await screen.findByText('Save');
    fireEvent.click(saveButton);

    // Wait for the success message
    await waitFor(async () => {
      await expect(putMock).toHaveBeenCalledWith({ defaultTimezone: 'UTC+02:00&Europe/Paris' });

      const successMessage = await screen.findByText('Default timezone updated.');
      expect(successMessage).toBeInTheDocument();
    });
  });

  it('should clear timezone value and save null when cleared', async () => {
    const putMock = jest.fn();
    setupPermissions(true, true);
    setupGetSettingsResponse('UTC+02:00&Europe/Paris');
    setupUpdateSettingsResponse(putMock, null);

    const { user } = render(<ProtectedReleasesSettingsPage />);

    // Wait for the combobox to be rendered
    const combobox = await screen.findByRole('combobox', { name: 'Default timezone' });
    expect(combobox).toHaveValue('UTC+02:00 Europe/Paris');

    // Clear the value of the combobox
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearButton);
    expect(combobox).toHaveValue('');

    // Save the new default timezone value
    const saveButton = await screen.findByText('Save');
    fireEvent.click(saveButton);

    // Wait for the success message
    await waitFor(async () => {
      await expect(putMock).toHaveBeenCalledWith({ defaultTimezone: null });

      const successMessage = await screen.findByText('Default timezone updated.');
      expect(successMessage).toBeInTheDocument();
    });
  });

  it('should show error message when invalid timezone is entered', async () => {
    setupPermissions(true, true);
    setupGetSettingsResponse('');

    const { user } = render(<ProtectedReleasesSettingsPage />);

    // Wait for the combobox to be rendered
    const combobox = await screen.findByRole('combobox', { name: 'Default timezone' });
    await user.click(combobox);
    await user.type(combobox, 'Invalid timezone');
    await user.keyboard('{Enter}');

    // Try to save the value
    const saveButton = await screen.findByText('Save');
    fireEvent.click(saveButton);

    // Wait for the error message (field error and notification with animation)
    await waitFor(async () => {
      const errorMessage = await screen.findAllByText('The value provided is not valid');
      expect(errorMessage).toHaveLength(2);
    });
  });
});
