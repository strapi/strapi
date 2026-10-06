import { render, screen, waitFor, server, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useSettings } from '../../../legacy/hooks/useSettings';
import { useGetUploadSettingsQuery } from '../../../services/settings';
import { SettingsPage } from '../SettingsPage';

jest.mock('../../../services/settings', () => {
  const actual = jest.requireActual('../../../services/settings');

  return {
    ...actual,
    useGetUploadSettingsQuery: jest.fn((...args: unknown[]) =>
      actual.useGetUploadSettingsQuery(...args)
    ),
  };
});

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
  });

  afterEach(() => {
    jest
      .mocked(useGetUploadSettingsQuery)
      .mockImplementation((...args: unknown[]) =>
        jest.requireActual('../../../services/settings').useGetUploadSettingsQuery(...args)
      );
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

  it('refreshes the upload settings cache the tracker reads when settings are saved', async () => {
    const refetch = jest.fn().mockResolvedValue({});
    jest.mocked(useGetUploadSettingsQuery).mockReturnValue({
      data: { data: { aiMetadata: false, aiMetadataAvailable: true } },
      refetch,
    } as ReturnType<typeof useGetUploadSettingsQuery>);

    server.use(
      http.put('*/upload/settings', () => {
        return HttpResponse.json({
          data: {
            sizeOptimization: true,
            responsiveDimensions: false,
            autoOrientation: true,
            aiMetadata: true,
          },
        });
      })
    );

    render(<SettingsPage />);

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox', { name: 'Responsive friendly upload' }));

    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });
});
