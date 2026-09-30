import { signExportToken, verifyExportToken, EXPORT_TOKEN_TTL_MS } from '../export-token';

const SECRET = 'test-secret';

describe('Audit logs export token', () => {
  it('verifies a token it signed for the same bound and filters', () => {
    const filters = { action: { $eq: 'entry.create' } };
    const token = signExportToken(SECRET, 42, filters);

    expect(verifyExportToken(SECRET, token, 42, filters)).toBe(true);
  });

  it('signs exports without filters consistently', () => {
    const token = signExportToken(SECRET, 42, undefined);

    expect(verifyExportToken(SECRET, token, 42, undefined)).toBe(true);
    expect(verifyExportToken(SECRET, token, 42, null)).toBe(true);
  });

  it('rejects a token for a different bound', () => {
    const token = signExportToken(SECRET, 42, undefined);

    expect(verifyExportToken(SECRET, token, 43, undefined)).toBe(false);
  });

  it('rejects a token for different filters', () => {
    const token = signExportToken(SECRET, 42, { action: { $eq: 'entry.create' } });

    expect(verifyExportToken(SECRET, token, 42, { action: { $eq: 'entry.delete' } })).toBe(false);
    expect(verifyExportToken(SECRET, token, 42, undefined)).toBe(false);
  });

  it('rejects a token signed with another secret', () => {
    const token = signExportToken('other-secret', 42, undefined);

    expect(verifyExportToken(SECRET, token, 42, undefined)).toBe(false);
  });

  it('rejects missing, empty, and malformed tokens', () => {
    expect(verifyExportToken(SECRET, undefined, 42, undefined)).toBe(false);
    expect(verifyExportToken(SECRET, '', 42, undefined)).toBe(false);
    expect(verifyExportToken(SECRET, 'not-a-signature', 42, undefined)).toBe(false);
    expect(verifyExportToken(SECRET, 'not-a-timestamp.abc', 42, undefined)).toBe(false);
    expect(verifyExportToken(SECRET, 12345, 42, undefined)).toBe(false);
  });

  it('rejects a token older than its validity window', () => {
    const issuedAt = Date.now();
    const token = signExportToken(SECRET, 42, undefined, issuedAt);

    expect(verifyExportToken(SECRET, token, 42, undefined, issuedAt + EXPORT_TOKEN_TTL_MS)).toBe(
      true
    );
    expect(
      verifyExportToken(SECRET, token, 42, undefined, issuedAt + EXPORT_TOKEN_TTL_MS + 1)
    ).toBe(false);
  });

  it('rejects a tampered issue time', () => {
    const issuedAt = Date.now();
    const token = signExportToken(SECRET, 42, undefined, issuedAt);
    const signature = token.slice(token.indexOf('.') + 1);

    // Backdating or forward-dating the timestamp invalidates the signature
    expect(verifyExportToken(SECRET, `${issuedAt + 1}.${signature}`, 42, undefined)).toBe(false);
  });

  it('tolerates small clock drift between nodes but not a future token', () => {
    const issuedAt = Date.now();
    const token = signExportToken(SECRET, 42, undefined, issuedAt);

    expect(verifyExportToken(SECRET, token, 42, undefined, issuedAt - 30 * 1000)).toBe(true);
    expect(verifyExportToken(SECRET, token, 42, undefined, issuedAt - 5 * 60 * 1000)).toBe(false);
  });
});
