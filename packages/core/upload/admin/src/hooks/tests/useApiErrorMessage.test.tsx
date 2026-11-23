/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { prefixPluginTranslations } from '../../legacy/utils/prefixPluginTranslations';
import { pluginId } from '../../pluginId';
import en from '../../translations/en.json';
import { useApiErrorMessage } from '../useApiErrorMessage';

// The shared `renderHook` mounts `LanguageProvider messages={{}}`, so nothing is
// translated by default. Its `wrapper` nests inside the providers, so this
// nearer IntlProvider is the one the hook sees.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={prefixPluginTranslations(en, pluginId)}>
    {children}
  </IntlProvider>
);

describe('useApiErrorMessage', () => {
  // `strapi::body` answers with the bare `FileTooBig` code when no size details reach the
  // caller, e.g. the crop dialog's apply and "save as copy" uploads.
  it('translates the body parser code with the shipped English messages', () => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ message: 'FileTooBig' }, 'Fallback')).toBe(
      'The file is too large to be uploaded. It exceeds the maximum request size allowed by the server.'
    );
  });

  it('translates another machine-readable code the server sent', () => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ message: 'FolderContainsUnauthorizedAssetsError' }, 'Fallback')).toBe(
      'The selected folders contain assets that you do not have permission to delete.'
    );
  });

  it('passes a server sentence through unchanged', () => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ message: 'photo.png exceeds size limit of 200 KB.' }, 'Fallback')).toBe(
      'photo.png exceeds size limit of 200 KB.'
    );
  });

  // A server message can contain braces — a validation error echoing a field
  // name or user input. These must never reach the ICU parser: the parse failure
  // routes through react-intl's `onError` (`console.error`), which the Jest setup
  // patches to throw, so it would escape the caller's click handler.
  it.each([
    'Invalid value for {field}',
    'Validation failed: {"name":"required"}',
    'Unexpected { in input',
  ])('passes a braced server message through without parsing it: %s', (message) => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ message }, 'Fallback')).toBe(message);
  });

  it("returns the caller's fallback when the error carries nothing usable", () => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ status: 500 }, 'Fallback')).toBe('Fallback');
    expect(result.current({ message: '' }, 'Fallback')).toBe('Fallback');
    expect(result.current(undefined, 'Fallback')).toBe('Fallback');
  });
});
