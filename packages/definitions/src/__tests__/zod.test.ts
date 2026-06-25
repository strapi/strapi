import { describe, expect, test } from 'vitest';

import { z } from '../index';

describe('@strapi/definitions zod export', () => {
  test('exports zod v4', () => {
    expect(z.string().parse('api::article.article')).toBe('api::article.article');
  });
});
