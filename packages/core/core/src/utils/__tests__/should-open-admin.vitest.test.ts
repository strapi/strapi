import { describe, it, expect } from 'vitest';
import { shouldOpenAdmin } from '../should-open-admin';

describe('shouldOpenAdmin', () => {
  it('never opens outside development', () => {
    expect(shouldOpenAdmin({ environment: 'production', open: true, isInitialized: false })).toBe(
      false
    );
  });

  it('opens on the first run by default', () => {
    expect(shouldOpenAdmin({ environment: 'development', isInitialized: false })).toBe(true);
  });

  it('does not reopen once an admin user exists', () => {
    expect(shouldOpenAdmin({ environment: 'development', isInitialized: true })).toBe(false);
  });

  it('respects admin.autoOpen false on the first run', () => {
    expect(
      shouldOpenAdmin({ environment: 'development', autoOpen: false, isInitialized: false })
    ).toBe(false);
  });

  it('opens on every start when open is true, even with an admin user', () => {
    expect(shouldOpenAdmin({ environment: 'development', open: true, isInitialized: true })).toBe(
      true
    );
  });

  it('opens when open is true even if admin.autoOpen is false', () => {
    expect(
      shouldOpenAdmin({
        environment: 'development',
        autoOpen: false,
        open: true,
        isInitialized: false,
      })
    ).toBe(true);
  });

  it('never opens when open is false, even on the first run', () => {
    expect(shouldOpenAdmin({ environment: 'development', open: false, isInitialized: false })).toBe(
      false
    );
  });
});
