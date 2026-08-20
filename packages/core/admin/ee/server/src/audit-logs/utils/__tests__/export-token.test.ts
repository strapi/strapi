import { signExportToken, verifyExportToken } from '../export-token';

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
    expect(verifyExportToken(SECRET, 12345, 42, undefined)).toBe(false);
  });
});
