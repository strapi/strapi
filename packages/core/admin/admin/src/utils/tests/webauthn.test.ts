import { ceremonyErrorKind } from '../webauthn';

/** What the browser itself throws, passed through by the library untouched. */
const domException = (name: string) =>
  Object.assign(new Error(`${name} from the browser`), { name });

/** What `@simplewebauthn/browser` throws once it has classified a DOMException. */
const webauthnError = (code: string, causeName: string) =>
  Object.assign(new Error('classified by the library'), {
    name: 'WebAuthnError',
    code,
    cause: domException(causeName),
  });

describe('ceremonyErrorKind', () => {
  it('reads a dismissed or timed-out prompt off the pass-through DOMException', () => {
    // The library deliberately returns `NotAllowedError` unchanged: platforms overload it with
    // their own messages, so it is never re-wrapped.
    expect(ceremonyErrorKind(domException('NotAllowedError'))).toBe('dismissed');
    expect(ceremonyErrorKind(domException('AbortError'))).toBe('dismissed');
  });

  it('reads a dismissed prompt off the library-classified abort code too', () => {
    expect(ceremonyErrorKind(webauthnError('ERROR_CEREMONY_ABORTED', 'AbortError'))).toBe(
      'dismissed'
    );
  });

  it('recognises an already-registered authenticator by code and by cause', () => {
    expect(
      ceremonyErrorKind(
        webauthnError('ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED', 'InvalidStateError')
      )
    ).toBe('already-registered');
    expect(ceremonyErrorKind(domException('InvalidStateError'))).toBe('already-registered');
  });

  it('recognises an origin or algorithm the browser will not run a ceremony for', () => {
    expect(ceremonyErrorKind(domException('SecurityError'))).toBe('unsupported');
    expect(ceremonyErrorKind(domException('NotSupportedError'))).toBe('unsupported');
    expect(ceremonyErrorKind(webauthnError('ERROR_INVALID_DOMAIN', 'SecurityError'))).toBe(
      'unsupported'
    );
  });

  it('falls back to failed for anything else, including non-objects', () => {
    expect(ceremonyErrorKind(domException('UnknownError'))).toBe('failed');
    expect(ceremonyErrorKind(new Error('plain'))).toBe('failed');
    expect(ceremonyErrorKind('a string')).toBe('failed');
    expect(ceremonyErrorKind(null)).toBe('failed');
    expect(ceremonyErrorKind(undefined)).toBe('failed');
  });
});
