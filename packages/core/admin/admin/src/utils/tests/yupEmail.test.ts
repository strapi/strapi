import { EMAIL_REGEX as SERVER_EMAIL_REGEX } from '@strapi/utils';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as yup from 'yup';

import { EMAIL_REGEX } from '../yupEmail';

const isValidEmail = (value: string) => yup.string().email().isValidSync(value);

// Runs `fn` with a hard time limit and returns how long it took. A backtracking regex is
// synchronous and Jest can't interrupt it, so a regression would hang the job instead of failing.
// The vm timeout stops it mid-match and throws.
const timedWithLimit = (limitMs: number, fn: () => void) => {
  const start = process.hrtime.bigint();
  vm.runInNewContext('fn()', { fn }, { timeout: limitMs });
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe('yup string().email() in the admin', () => {
  // The override only covers schemas built after it runs, and some admin modules build theirs at
  // import time. In the browser nothing else patches yup, so the admin entry must import it first.
  test('is the first import of the admin entry', () => {
    const entry = readFileSync(path.join(__dirname, '../../index.ts'), 'utf8');
    const firstStatement = entry
      .split('\n')
      .map((line) => line.trim())
      .find(
        (line) => line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')
      );

    expect(firstStatement).toBe("import './utils/yupEmail';");
  });

  test('uses the same regex as the server', () => {
    expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
    expect(EMAIL_REGEX.source).toBe(SERVER_EMAIL_REGEX.source);
    expect(EMAIL_REGEX.flags).toBe(SERVER_EMAIL_REGEX.flags);
  });

  test.each([
    ['a domain made of many short labels', `a@${'a.'.repeat(24)}!`],
    ['an unterminated quoted local part', `"${'x'.repeat(28)}`],
  ])('rejects %s without backtracking', (_, value) => {
    let result = true;
    const duration = timedWithLimit(1000, () => {
      result = isValidEmail(value);
    });

    expect(result).toBe(false);
    expect(duration).toBeLessThan(100);
  });

  test.each(['user@example.com', 'first.last@sub.example.co.uk', '"john doe"@example.com'])(
    'accepts %s',
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    }
  );

  test('rejects a domain with consecutive dots, which the stock yup regex let through', () => {
    expect(isValidEmail('user@sub..example.com')).toBe(false);
  });

  test('prefers an explicit message', () => {
    expect(() => yup.string().email('custom message').validateSync('nope')).toThrow(
      'custom message'
    );
  });

  describe('with a custom locale', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const defaultMessage = '${path} must be a valid email';

    afterEach(() => {
      yup.setLocale({ string: { email: defaultMessage } });
    });

    test('uses the locale message when none is passed', () => {
      // eslint-disable-next-line no-template-curly-in-string
      yup.setLocale({ string: { email: '${path} is not an email address' } });

      expect(() => yup.string().email().validateSync('nope')).toThrow(
        'this is not an email address'
      );
    });
  });
});
