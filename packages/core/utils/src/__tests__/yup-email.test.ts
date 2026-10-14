import { yup } from '..';

const isValidEmail = (value: string) => yup.string().email().isValidSync(value);

const timed = (fn: () => void) => {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe('yup string().email()', () => {
  test.each([
    ['a domain made of many short labels', `a@${'a.'.repeat(24)}!`],
    ['an unterminated quoted local part', `"${'x'.repeat(28)}`],
  ])('rejects %s without backtracking', (_, value) => {
    let result = true;
    const duration = timed(() => {
      result = isValidEmail(value);
    });

    expect(result).toBe(false);
    expect(duration).toBeLessThan(100);
  });

  test('stays fast on very long input', () => {
    const duration = timed(() => {
      isValidEmail(`a@${'a.'.repeat(50_000)}!`);
      isValidEmail(`"${'x'.repeat(100_000)}`);
    });

    expect(duration).toBeLessThan(500);
  });

  test.each([
    'user@example.com',
    'first.last@sub.example.co.uk',
    'user+tag@example.com',
    'USER@EXAMPLE.COM',
    'a@b.co',
    'user@my-domain.example',
    'user@my_host.example.com',
    'user@xn--bcher-kva.example',
    'ünïcödé@exämple.com',
    '"john doe"@example.com',
    '"john\\"doe"@example.com',
    'user@1example.com',
  ])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  test.each([
    'plainaddress',
    '@example.com',
    'user@',
    'user@example',
    'user@-example.com',
    '.user@example.com',
    'user.@example.com',
    'us er@example.com',
    'user@example.com.',
  ])('rejects %s', (value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  test.each([
    ['consecutive dots', 'user@sub..example.com'],
    ['a label starting with a hyphen', 'user@sub.-example.com'],
    ['a label ending with a hyphen', 'user@sub.example-.com'],
    ['a top-level label starting with a digit', 'user@mail.example.1com'],
  ])('rejects a domain with %s, which the stock yup regex let through', (_, value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  test('accepts an empty string so optional fields still validate', () => {
    expect(isValidEmail('')).toBe(true);
  });

  test('keeps the default error message', () => {
    expect(() => yup.string().email().validateSync('nope')).toThrow('this must be a valid email');
  });
});
