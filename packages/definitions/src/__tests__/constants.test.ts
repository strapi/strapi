import { describe, expect, test } from 'vitest';

import { constants } from '../index';

describe('@strapi/definitions constants export', () => {
  test('exports regex constants', () => {
    expect(constants.regex.BIG_INTEGER.test('-42')).toBe(true);
    expect(constants.regex.BIG_INTEGER.test('42.1')).toBe(false);
  });
});
