import path from 'node:path';
import fs from 'node:fs/promises';
import coffee from 'coffee';

import { getTestApps } from '../../../../utils/get-test-apps';

/**
 * This test ensures that `strapi openapi generate` includes content API routes
 * from the i18n and users-permissions plugins in the generated specification.
 */
describe('openapi:generate', () => {
  let appPath;
  const OUTPUT_FILE = 'openapi-spec.json';

  beforeAll(async () => {
    const testApps = getTestApps();
    appPath = testApps.at(0);
  });

  afterEach(async () => {
    try {
      await fs.unlink(path.join(appPath, OUTPUT_FILE));
    } catch (_) {}
  });

  it('should generate a spec describing i18n and users-permissions content API routes', async () => {
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'openapi', 'generate', '--', '-o', OUTPUT_FILE], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    // Generate an openapi spec for the test app and read it's contents
    const specPath = path.join(appPath, OUTPUT_FILE);
    const raw = await fs.readFile(specPath, 'utf8');
    const spec = JSON.parse(raw);

    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();

    const paths = Object.keys(spec.paths || {});

    const hasPathEndingWith = (suffix: string) => paths.some((p) => p.endsWith(suffix));

    // Checking for known plugin routes - ensuring the plugins are covered by
    // the openapi spec

    // i18n
    expect(hasPathEndingWith('/locales')).toBe(true);

    // users-permissions
    expect(hasPathEndingWith('/auth/local')).toBe(true);
    expect(hasPathEndingWith('/auth/local/register')).toBe(true);
    expect(hasPathEndingWith('/auth/{provider}/callback')).toBe(true);
    expect(hasPathEndingWith('/users')).toBe(true);
    expect(hasPathEndingWith('/users/{id}')).toBe(true);
  });
});
