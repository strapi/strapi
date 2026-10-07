import { shouldAttemptCloudLogin } from '../cloud';

describe('shouldAttemptCloudLogin', () => {
  it('prompts when a human is at a TTY and did not opt out', () => {
    expect(
      shouldAttemptCloudLogin({
        stdinIsTTY: true,
      })
    ).toBe(true);
  });

  it('skips when --skip-cloud or --non-interactive is set', () => {
    expect(shouldAttemptCloudLogin({ skipCloud: true, stdinIsTTY: true })).toBe(false);
    expect(shouldAttemptCloudLogin({ nonInteractive: true, stdinIsTTY: true })).toBe(false);
  });

  it('skips when stdin is not a TTY', () => {
    expect(shouldAttemptCloudLogin({ stdinIsTTY: false })).toBe(false);
    expect(shouldAttemptCloudLogin({ stdinIsTTY: undefined })).toBe(false);
  });

  it('skips when CI is true or 1, even if stdin is a TTY', () => {
    expect(shouldAttemptCloudLogin({ ci: 'true', stdinIsTTY: true })).toBe(false);
    expect(shouldAttemptCloudLogin({ ci: '1', stdinIsTTY: true })).toBe(false);
    expect(shouldAttemptCloudLogin({ ci: 'TRUE', stdinIsTTY: true })).toBe(false);
  });

  it('still prompts when CI is unset or false and stdin is a TTY', () => {
    expect(shouldAttemptCloudLogin({ ci: undefined, stdinIsTTY: true })).toBe(true);
    expect(shouldAttemptCloudLogin({ ci: 'false', stdinIsTTY: true })).toBe(true);
    expect(shouldAttemptCloudLogin({ ci: '', stdinIsTTY: true })).toBe(true);
  });
});
