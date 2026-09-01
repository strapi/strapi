import * as _ from 'lodash';
import { MFA_DEFAULTS, validateMfaConfig } from '../mfa';
import * as config from '../index';

const makeLogger = () => {
  const warnings: string[] = [];
  return { warnings, warn: (msg: string) => warnings.push(msg) };
};

describe('validateMfaConfig', () => {
  test('returns defaults when given nothing', () => {
    const logger = makeLogger();
    expect(validateMfaConfig(undefined, logger)).toEqual(MFA_DEFAULTS);
    expect(logger.warnings).toHaveLength(0);
  });

  test('falls back to the default digits and warns when digits break interop', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ digits: 4 }, logger);
    expect(result.digits).toBe(MFA_DEFAULTS.digits);
    expect(logger.warnings.join(' ')).toContain('digits');
  });

  test('falls back to the default step and warns when step is not positive', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ step: 0 }, logger);
    expect(result.step).toBe(MFA_DEFAULTS.step);
    expect(logger.warnings.join(' ')).toContain('step');
  });

  test('honours a wider window but warns about it', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ window: { back: 3, forward: 3 } }, logger);
    expect(result.window).toEqual({ back: 3, forward: 3 });
    expect(logger.warnings.join(' ')).toContain('window');
  });

  test('honours a large recovery code count but warns about bcrypt cost', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ recoveryCodeCount: 50 }, logger);
    expect(result.recoveryCodeCount).toBe(50);
    expect(logger.warnings.join(' ')).toContain('recoveryCodeCount');
  });

  test('honours an attempt cap above the NIST ceiling but warns', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ maxUserAttempts: 500 }, logger);
    expect(result.maxUserAttempts).toBe(500);
    expect(logger.warnings.join(' ')).toContain('maxUserAttempts');
  });

  test('accepts 8 digits without warning', () => {
    const logger = makeLogger();
    expect(validateMfaConfig({ digits: 8 }, logger).digits).toBe(8);
    expect(logger.warnings).toHaveLength(0);
  });

  test('falls back to the default window.back and warns when it is NaN', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ window: { back: NaN } }, logger);
    expect(result.window.back).toBe(MFA_DEFAULTS.window.back);
    expect(logger.warnings.join(' ')).toContain('window.back');
  });

  test('falls back to the default window.back and warns when it is negative', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ window: { back: -1 } }, logger);
    expect(result.window.back).toBe(MFA_DEFAULTS.window.back);
    expect(logger.warnings.join(' ')).toContain('window.back');
  });

  test('falls back to the default maxChallengeAttempts and warns when it is NaN', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ maxChallengeAttempts: NaN }, logger);
    expect(result.maxChallengeAttempts).toBe(MFA_DEFAULTS.maxChallengeAttempts);
    expect(logger.warnings.join(' ')).toContain('maxChallengeAttempts');
  });

  test('falls back to the default maxUserAttempts and warns when it is negative', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ maxUserAttempts: -5 }, logger);
    expect(result.maxUserAttempts).toBe(MFA_DEFAULTS.maxUserAttempts);
    expect(logger.warnings.join(' ')).toContain('maxUserAttempts');
  });

  test('honours a high maxChallengeAttempts but warns about it', () => {
    const logger = makeLogger();
    const result = validateMfaConfig({ maxChallengeAttempts: 20 }, logger);
    expect(result.maxChallengeAttempts).toBe(20);
    expect(logger.warnings.join(' ')).toContain('maxChallengeAttempts');
  });

  test('MFA_DEFAULTS cannot be mutated through config export', () => {
    // Save original values
    const originalDigits = MFA_DEFAULTS.digits;
    const originalBack = MFA_DEFAULTS.window.back;

    // Get the exported config and mutate it via lodash merge (the real path)
    const exportedConfig = config.default;
    _.merge(exportedConfig, {
      auth: {
        mfa: {
          digits: 8,
          window: { back: 5 },
        },
      },
    });

    // Verify MFA_DEFAULTS is unchanged
    expect(MFA_DEFAULTS.digits).toBe(originalDigits);
    expect(MFA_DEFAULTS.window.back).toBe(originalBack);
  });
});
