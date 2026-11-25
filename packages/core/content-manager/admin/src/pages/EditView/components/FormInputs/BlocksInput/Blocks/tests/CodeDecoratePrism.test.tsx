/**
 * Regression: #25070 / #26964 — admin can blank-crash when `prismjs` is bundled so `import *` has no
 * top-level `.languages` and language plugins expect `Prism` global — `decorateCode` must resolve
 * Prism from `window` / bail safely (PR #25660). Keep `prismjs` in Vite `optimizeDeps.include`;
 * do not include `prismjs/components/*.js` (that language glob causes the blank-admin crash).
 *
 * This file mocks `prismjs` like Vite’s prebundle and clears `window.Prism`.
 *
 * @see https://github.com/strapi/strapi/issues/25070
 */

jest.mock('prismjs', () => {
  const actual = jest.requireActual<typeof import('prismjs')>('prismjs');
  const DefaultExport = (actual as { default?: typeof actual }).default ?? actual;
  return {
    __esModule: true,
    default: DefaultExport,
  };
});

import { decorateCode } from '../Code';

import type { NodeEntry } from 'slate';

describe('Code', () => {
  describe('decorateCode', () => {
    describe('Prism (issue #25070)', () => {
      const codeEntry: NodeEntry = [
        {
          type: 'code',
          language: 'javascript',
          children: [{ type: 'text', text: 'const a = 1' }],
        },
        [0],
      ];

      beforeEach(() => {
        delete (globalThis as unknown as { Prism?: unknown }).Prism;
      });

      it('should not throw when prismjs resolves like a Vite prebundle', () => {
        expect(() => decorateCode(codeEntry)).not.toThrow();
        expect(Array.isArray(decorateCode(codeEntry))).toBe(true);
      });
    });
  });
});
