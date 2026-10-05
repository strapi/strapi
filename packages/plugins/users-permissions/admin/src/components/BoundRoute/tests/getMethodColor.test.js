import { describe, expect, it } from 'vitest';

import getMethodColor from '../getMethodColor';

describe('route method colors', () => {
  it.each([
    ['POST', 'success'],
    ['GET', 'secondary'],
    ['PUT', 'warning'],
    ['DELETE', 'danger'],
    ['PATCH', 'neutral'],
  ])('uses the %s method color for route details', (method, color) => {
    expect(getMethodColor(method)).toEqual({
      text: `${color}600`,
      border: `${color}200`,
      background: `${color}100`,
    });
  });
});
