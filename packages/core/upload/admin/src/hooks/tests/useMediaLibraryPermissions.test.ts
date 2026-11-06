import { renderHook, waitFor } from '@tests/utils';

import { useMediaLibraryPermissions } from '../useMediaLibraryPermissions';

type Permissions = Array<{ action: string }>;

const withOnly =
  (...actions: string[]) =>
  (defaults: Permissions) =>
    defaults.filter((permission) => actions.includes(permission.action));

const renderPermissions = (permissions: (defaults: Permissions) => Permissions) =>
  renderHook(() => useMediaLibraryPermissions(), { providerOptions: { permissions } });

describe('useMediaLibraryPermissions', () => {
  it('grants canRead from plugin::upload.read', async () => {
    const { result } = renderPermissions(withOnly('plugin::upload.read'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toMatchObject({
      canRead: true,
      canCreate: false,
      canUpdate: false,
      canDownload: false,
      canCopyLink: false,
    });
  });

  it('does not grant canRead from plugin::upload.settings.read', async () => {
    const { result } = renderPermissions(withOnly('plugin::upload.settings.read'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canRead).toBe(false);
  });
});
