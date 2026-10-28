/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { useApiErrorMessage } from '../useApiErrorMessage';

// The shared `renderHook` mounts `LanguageProvider messages={{}}`, so nothing is
// translated by default. Its `wrapper` nests inside the providers, so this
// nearer IntlProvider is the one the hook sees.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider
    locale="en"
    messages={{
      'upload.apiError.FileTooBig': 'The uploaded file exceeds the maximum allowed asset size.',
    }}
  >
    {children}
  </IntlProvider>
);

describe('useApiErrorMessage', () => {
  it('translates a machine-readable code the server sent', () => {
    const { result } = renderHook(() => useApiErrorMessage(), { wrapper });

    expect(result.current({ message: 'FileTooBig' }, 'Fallback')).toBe(
      'The uploaded file exceeds the maximum allowed asset size.'
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
