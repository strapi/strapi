import { shouldSkipCloudLogin } from '../should-skip-cloud-login';

describe('shouldSkipCloudLogin', () => {
  it('skips when --skip-cloud is set, even on a TTY outside CI', () => {
    expect(shouldSkipCloudLogin({ skipCloud: true }, {}, true)).toBe(true);
  });

  it('skips when --non-interactive is set, even on a TTY outside CI', () => {
    expect(shouldSkipCloudLogin({ nonInteractive: true }, {}, true)).toBe(true);
  });

  it('skips when CI is true or 1, even if stdin is a TTY', () => {
    expect(shouldSkipCloudLogin({}, { CI: 'true' }, true)).toBe(true);
    expect(shouldSkipCloudLogin({}, { CI: '1' }, true)).toBe(true);
    expect(shouldSkipCloudLogin({}, { CI: 'TRUE' }, true)).toBe(true);
  });

  it('does not treat other CI values as enabled', () => {
    expect(shouldSkipCloudLogin({}, { CI: 'false' }, true)).toBe(false);
    expect(shouldSkipCloudLogin({}, { CI: '0' }, true)).toBe(false);
    expect(shouldSkipCloudLogin({}, { CI: '' }, true)).toBe(false);
  });

  it('skips when stdin is not a TTY', () => {
    expect(shouldSkipCloudLogin({}, {}, false)).toBe(true);
  });

  it('prompts when a human is at a TTY and did not opt out', () => {
    expect(shouldSkipCloudLogin({}, {}, true)).toBe(false);
  });
});
