import { useTracking as useStrapiTracking, useNotification } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor, server, fireEvent, act } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useSettings } from '../../../legacy/hooks/useSettings';
import { SettingsPage } from '../SettingsPage';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useTracking: jest.fn(),
  useNotification: jest.fn(),
}));

// `useSettings` is mocked for every admin test (see `admin/tests/setup.ts`).
const mockSettings = (aiMetadataAvailable: boolean) => {
  (useSettings as jest.Mock).mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      sizeOptimization: true,
      responsiveDimensions: true,
      autoOrientation: true,
      aiMetadata: true,
      aiMetadataAvailable,
    },
    refetch: jest.fn(),
    error: null,
  });
};

describe('SettingsPage', () => {
  beforeEach(() => {
    mockSettings(false);
    jest.mocked(useNotification).mockReturnValue({ toggleNotification: jest.fn() });
    jest.mocked(useStrapiTracking).mockReturnValue({ trackUsage: jest.fn() });
  });

  it('renders', async () => {
    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Media Library' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Asset management' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('checkbox', { name: 'Responsive friendly upload' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Size optimization' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Auto orientation' })).toBeInTheDocument();
  });

  it('should display the form correctly with the initial values', async () => {
    const { getByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('button', { name: 'Save' })).toBeDisabled();

    expect(getByRole('checkbox', { name: 'Responsive friendly upload' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'Size optimization' })).toBeChecked();
    expect(getByRole('checkbox', { name: 'Auto orientation' })).toBeChecked();
  });

  it('shows AI metadata section when an AI metadata provider is registered', async () => {
    mockSettings(true);

    const { queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    // Use findByRole to properly wait for async state updates (formatMessage, useQuery, etc.)
    // and avoid "An update to SettingsPage inside a test was not wrapped in act(...)" warnings
    expect(
      await screen.findByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).toBeInTheDocument();
  });

  it('hides AI metadata section when no AI metadata provider is registered', async () => {
    mockSettings(false);

    const { queryByRole, queryByText } = render(<SettingsPage />);

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    // Check that AI metadata section is NOT visible
    expect(
      queryByRole('heading', {
        name: 'Generate AI captions and alt texts automatically on upload!',
      })
    ).not.toBeInTheDocument();
  });

  it('tracks the saved AI setting only after the upload settings cache is refreshed', async () => {
    jest
      .mocked(useSettings)
      .mockImplementation(jest.requireActual('../../../legacy/hooks/useSettings').useSettings);
    const trackUsage = jest.fn();
    jest.mocked(useStrapiTracking).mockReturnValue({ trackUsage });
    let settings = {
      sizeOptimization: true,
      responsiveDimensions: true,
      autoOrientation: true,
      aiMetadata: false,
      aiMetadataAvailable: true,
    };
    let saved = false;
    let refreshStarted = false;
    let refreshFinished = false;
    const notifyAfterRefresh = jest.fn();
    jest.mocked(useNotification).mockReturnValue({
      toggleNotification: (notification) => notifyAfterRefresh(notification.type, refreshFinished),
    });
    let releaseRefresh = () => {};
    const refreshPending = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    server.use(
      http.get('*/upload/settings', async () => {
        if (saved) {
          refreshStarted = true;
          await refreshPending;
          refreshFinished = true;
        }
        return HttpResponse.json({ data: settings });
      }),
      http.put('*/upload/settings', async ({ request }) => {
        const body = (await request.json()) as { aiMetadata: boolean };
        settings = { ...settings, aiMetadata: body.aiMetadata };
        saved = true;
        return HttpResponse.json({ data: settings });
      }),
      http.get('*/upload/ai-metadata-jobs/pending-count', () =>
        HttpResponse.json({ imagesWithoutMetadataCount: 1, totalImages: 1 })
      ),
      http.post('*/upload/ai-metadata-jobs', () => HttpResponse.json({}))
    );

    const { user } = render(<SettingsPage />);
    const aiToggle = await screen.findByRole('checkbox', { name: '' });
    expect(aiToggle).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Generate metadata' })).not.toBeInTheDocument();

    fireEvent.click(aiToggle);
    expect(aiToggle).toBeChecked();
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(saved).toBe(true));
    await waitFor(() => expect(refreshStarted).toBe(true));

    try {
      expect(notifyAfterRefresh).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Generate metadata' })).not.toBeInTheDocument();
    } finally {
      await act(async () => releaseRefresh());
    }

    await user.click(await screen.findByRole('button', { name: 'Generate metadata' }));
    expect(notifyAfterRefresh).toHaveBeenCalledWith('success', true);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(trackUsage).toHaveBeenCalledWith('didGenerateMetadataRetroactively', {
        isAiMediaLibraryConfigured: true,
        mediaLibraryVersion: 'v2',
      });
    });
  });
});
