import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  DESIGN_SYSTEM_BUNDLE_DIST_FILES,
  DESIGN_SYSTEM_BUNDLE_MUST_BE_EXTERNAL,
  DESIGN_SYSTEM_BUNDLE_MUST_NOT_CONTAIN,
} from '../design-system-bundle-contract';
import { getModulePath } from '../resolve-module';

const externalImportPattern = (pkg: string) =>
  new RegExp(`(?:from|require\\()\\s*["']${pkg.replace('/', '\\/')}["']`);

/**
 * Regression guard for strapi/strapi #26951 — installed design-system must not
 * inline singleton deps that break CodeMirror in production admin builds.
 */
describe('@strapi/design-system published bundle contract', () => {
  const packageRoot = getModulePath('@strapi/design-system');

  describe.each(DESIGN_SYSTEM_BUNDLE_DIST_FILES)('%s', (relPath) => {
    const content = readFileSync(resolve(packageRoot, relPath), 'utf-8');

    it.each(DESIGN_SYSTEM_BUNDLE_MUST_NOT_CONTAIN)(
      'does not inline forbidden marker: %s',
      (marker) => {
        expect(content).not.toContain(marker);
      }
    );

    it.each(DESIGN_SYSTEM_BUNDLE_MUST_BE_EXTERNAL)('imports %s externally', (pkg) => {
      expect(content).toMatch(externalImportPattern(pkg));
    });
  });
});
