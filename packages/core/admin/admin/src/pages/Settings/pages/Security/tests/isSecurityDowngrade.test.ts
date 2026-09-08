import { isTrustedDevicesDowngrade } from '../utils/isSecurityDowngrade';

describe('isTrustedDevicesDowngrade', () => {
  const on30 = { enabled: true, days: 30 };
  const off30 = { enabled: false, days: 30 };

  it('enabling trust is a downgrade', () => {
    expect(isTrustedDevicesDowngrade(off30, on30)).toBe(true);
  });

  it('raising days while enabled is a downgrade', () => {
    expect(isTrustedDevicesDowngrade(on30, { enabled: true, days: 60 })).toBe(true);
  });

  it('raising days while disabled is not', () => {
    expect(isTrustedDevicesDowngrade(off30, { enabled: false, days: 60 })).toBe(false);
  });

  it('lowering days, disabling, or saving the same values is not', () => {
    expect(isTrustedDevicesDowngrade(on30, { enabled: true, days: 7 })).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, off30)).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, { enabled: false, days: 60 })).toBe(false);
    expect(isTrustedDevicesDowngrade(on30, on30)).toBe(false);
  });
});
