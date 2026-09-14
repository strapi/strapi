import { FetchError } from '@strapi/admin/strapi-admin';
import { renderHook, waitFor } from '@tests/utils';

import { useAIMetadataEnabled } from '../useAIMetadataEnabled';
import { useSettings } from '../useSettings';

// `useSettings` is mocked for every admin test (see `admin/tests/setup.ts`).
const mockUseSettings = useSettings as jest.Mock;

const mockSettings = (data: { aiMetadata?: boolean; aiMetadataAvailable?: boolean }) => {
  mockUseSettings.mockReturnValue({
    status: 'success',
    isLoading: false,
    isError: false,
    data,
    error: null,
  });
};

// The real error carries its status in the response body; the hook only reads
// the field the client fills in from it.
const fetchError = (status: number) => Object.assign(new FetchError('Request failed'), { status });

const mockSettingsError = (error: unknown) => {
  mockUseSettings.mockReturnValue({
    status: 'error',
    isLoading: false,
    isError: true,
    data: undefined,
    error,
  });
};

describe('useAIMetadataEnabled', () => {
  it('is disabled when no AI metadata provider is registered', async () => {
    mockSettings({ aiMetadata: true, aiMetadataAvailable: false });

    const { result } = renderHook(() => useAIMetadataEnabled());

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isEnabled).toBe(false);
  });

  it('is disabled when the aiMetadata setting is off', async () => {
    mockSettings({ aiMetadata: false, aiMetadataAvailable: true });

    const { result } = renderHook(() => useAIMetadataEnabled());

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isEnabled).toBe(false);
  });

  it('is enabled when a provider is registered and the setting is on', async () => {
    mockSettings({ aiMetadata: true, aiMetadataAvailable: true });

    const { result } = renderHook(() => useAIMetadataEnabled());

    await waitFor(() => expect(result.current.isEnabled).toBe(true));
    expect(result.current.status).toBe('success');
  });

  // Editors have no `settings.read` permission, so the request 403s
  // (strapi/strapi#25131). That must read as "no AI", not as a page error.
  it('reports success and no AI when the settings request is forbidden', async () => {
    mockSettingsError(fetchError(403));

    const { result } = renderHook(() => useAIMetadataEnabled());

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isEnabled).toBe(false);
  });

  it('keeps reporting any other failure as an error', async () => {
    mockSettingsError(fetchError(500));

    const { result } = renderHook(() => useAIMetadataEnabled());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.isEnabled).toBe(false);
  });
});
