import { CAPABILITY_ROUTES } from '../settings-capabilities';

const gates = (path: string, method: string): string | undefined =>
  CAPABILITY_ROUTES.find(
    (entry) => entry.pattern.test(path) && (!entry.methods || entry.methods.includes(method))
  )?.capability;

/**
 * Pins every REAL endpoint each capability must gate. This is the test that
 * would have caught the Media Library hole: the new uploader posts to
 * `/upload/unstable/upload-file`, not to the classic `POST /upload`.
 */
describe('capability route coverage', () => {
  it('gates every Media Library creation endpoint, and only creation', () => {
    expect(gates('/upload', 'POST')).toBe('upload');
    expect(gates('/upload/unstable/upload-file', 'POST')).toBe('upload');
    expect(gates('/upload/unstable/stream-from-urls', 'POST')).toBe('upload');
    expect(gates('/upload/folders', 'POST')).toBe('upload');

    // Browsing stays open.
    expect(gates('/upload/files', 'GET')).toBeUndefined();
    expect(gates('/upload/folders', 'GET')).toBeUndefined();
  });

  it('gates Media Library settings writes only', () => {
    expect(gates('/upload/settings', 'PUT')).toBe('mediaLibrarySettings');
    expect(gates('/upload/settings', 'GET')).toBeUndefined();
  });

  it('gates locale management but never locale reads (CM locale picker)', () => {
    expect(gates('/i18n/locales', 'POST')).toBe('internationalization');
    expect(gates('/i18n/locales/2', 'PUT')).toBe('internationalization');
    expect(gates('/i18n/locales/2', 'DELETE')).toBe('internationalization');
    expect(gates('/i18n/locales', 'GET')).toBeUndefined();
  });

  it('gates the settings sections', () => {
    expect(gates('/admin/api-tokens', 'GET')).toBe('apiTokens');
    expect(gates('/admin/api-tokens/1', 'DELETE')).toBe('apiTokens');
    expect(gates('/admin/transfer/tokens', 'GET')).toBe('transferTokens');
    expect(gates('/admin/webhooks', 'GET')).toBe('webhooks');
    expect(gates('/admin/users', 'GET')).toBe('users');
    expect(gates('/admin/roles', 'GET')).toBe('roles');
  });

  it('gates moving entries by the source workspace', () => {
    expect(gates('/spaces/move', 'POST')).toBe('moveEntries');
  });

  it('never gates the switcher or unrelated admin routes', () => {
    expect(gates('/spaces/mine', 'GET')).toBeUndefined();
    expect(gates('/admin/init', 'GET')).toBeUndefined();
    expect(gates('/content-manager/content-types', 'GET')).toBeUndefined();
  });
});
