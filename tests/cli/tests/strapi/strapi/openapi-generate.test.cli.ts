import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import stripAnsi from 'strip-ansi';

import { getTestApps } from '../../../../utils/get-test-apps';

/** Recursively sort object keys for stable JSON snapshots (arrays keep order). */
const sortKeysDeep = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
};

/** Values that change between runs or releases; replaced before snapshot so CLI output stays stable. */
const ISO_DATETIME_DEFAULT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const volatileSnapshotReplacements: {
  test: (key: string, value: unknown) => boolean;
  placeholder: string;
}[] = [
  {
    test: (key, value) =>
      key === 'default' && typeof value === 'string' && ISO_DATETIME_DEFAULT.test(value),
    placeholder: '<generated-at-runtime>',
  },
  {
    test: (key, value) => key === 'x-strapi-version' && typeof value === 'string',
    placeholder: '<current-strapi-version>',
  },
];

const replaceVolatileSnapshotValues = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(replaceVolatileSnapshotValues);
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    const rule = volatileSnapshotReplacements.find((r) => r.test(key, v));
    out[key] = rule ? rule.placeholder : replaceVolatileSnapshotValues(v);
  }
  return out;
};

describe('openapi:generate', () => {
  let appPath: string;
  const OUTPUT_FILE = 'openapi-spec.json';

  beforeAll(async () => {
    const testApps = getTestApps();
    appPath = testApps.at(0) as string;
  });

  afterEach(async () => {
    try {
      await fs.unlink(path.join(appPath, OUTPUT_FILE));
    } catch (_) {}
  });

  it('should generate a spec describing i18n and users-permissions content API routes', async () => {
    const { stdout, stderr } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'openapi', 'generate', '--', '-o', OUTPUT_FILE], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    const specPath = path.join(appPath, OUTPUT_FILE);
    const raw = await fs.readFile(specPath, 'utf8');
    const spec = JSON.parse(raw);

    expect(spec).toBeDefined();
    expect(spec.paths).toBeDefined();

    const paths = Object.keys(spec.paths || {});

    const hasPathEndingWith = (suffix: string) => paths.some((p) => p.endsWith(suffix));

    expect(hasPathEndingWith('/locales')).toBe(true);
    expect(hasPathEndingWith('/auth/local')).toBe(true);
    expect(hasPathEndingWith('/auth/local/register')).toBe(true);
    expect(hasPathEndingWith('/auth/{provider}/callback')).toBe(true);
    expect(hasPathEndingWith('/users')).toBe(true);
    expect(hasPathEndingWith('/users/{id}')).toBe(true);

    // Full document snapshot (stable key order, volatile fields normalized)
    expect(sortKeysDeep(replaceVolatileSnapshotValues(spec))).toMatchSnapshot();

    const plainOut = stripAnsi(stdout);
    const plainErr = stripAnsi(stderr);

    expect(plainOut).toMatch(/Generated an OpenAPI specification for/);
    expect(plainOut).toMatch(/in \d+ms/);
    expect(plainErr).toMatch(/OpenAPI generation feature is currently experimental/);
  });

  it('should print debug logs when DEBUG matches strapi OpenAPI namespaces', async () => {
    const { stderr } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'openapi', 'generate', '--', '-o', OUTPUT_FILE], {
        cwd: appPath,
        env: {
          ...process.env,
          // Sub-loggers use strapi:core:openapi:<section>; wildcard enables them all
          DEBUG: 'strapi:core:openapi*',
        },
      })
      .expect('code', 0)
      .end();

    const plainErr = stripAnsi(stderr);
    expect(plainErr).toMatch(/strapi:core:openapi:generator/);
    expect(plainErr).toMatch(/generating a new OpenAPI document/);
  });
});
