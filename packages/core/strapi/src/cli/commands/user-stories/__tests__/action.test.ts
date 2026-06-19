import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  parseUserStory,
  toVitestSpecPath,
  renderSkeleton,
  extractExistingIds,
  syncUserStories,
} from '../action';

const SAMPLE = `# Admin Login

> Source: \`tests/e2e/tests/admin/login.spec.ts\`

## User Story: Log in

**As a** admin **I want** to log in **so that** I can work.

### Acceptance Criteria

- **Given** I am on the login page **When** I log in without "remember me" **Then** I land on the home page **And** a session cookie is created.
- **Given** I am logged in **When** I clear cookies and reload **Then** I am redirected to the login page.

## User Story: Rate limiting

**As a** admin **I want** throttling **so that** brute force is deterred.

### Acceptance Criteria

- **Given** rate limiting is on **When** I click Login 6 times **Then** I see "Too many requests".
- (Rate limiting is toggled off again after the test.)
`;

describe('parseUserStory', () => {
  it('extracts title, source and Given/When/Then criteria, skipping non-AC bullets', () => {
    const doc = parseUserStory(SAMPLE);

    expect(doc.title).toBe('Admin Login');
    expect(doc.source).toBe('tests/e2e/tests/admin/login.spec.ts');
    expect(doc.stories).toHaveLength(2);

    const [login, rate] = doc.stories;
    expect(login.name).toBe('Log in');
    expect(login.criteria.map((c) => c.id)).toEqual(['AC1.1', 'AC1.2']);
    expect(login.criteria[0].when).toBe('I log in without "remember me"');
    expect(login.criteria[0].then).toBe('I land on the home page');

    // The parenthetical "(Rate limiting…)" bullet has no **Then** and is skipped.
    expect(rate.criteria.map((c) => c.id)).toEqual(['AC2.1']);
  });
});

describe('toVitestSpecPath', () => {
  it('rewrites .spec.ts to .vitest.spec.ts', () => {
    expect(toVitestSpecPath('tests/e2e/tests/admin/login.spec.ts')).toBe(
      'tests/e2e/tests/admin/login.vitest.spec.ts'
    );
  });
});

describe('renderSkeleton', () => {
  it('emits one test.todo per criterion with a stable AC id and the correct fixture import prefix', () => {
    const doc = parseUserStory(SAMPLE);
    const out = renderSkeleton(doc, {
      sourceDocRelPath: 'user-stories/admin/login.md',
      specPathFromRoot: 'tests/e2e/tests/admin/login.vitest.spec.ts',
    });

    expect(out).toContain("describe('Admin Login'");
    expect(out).toContain("describe('Log in'");
    expect(out).toContain('test.todo(\'AC1.1 — I log in without "remember me"\');');
    expect(out).toContain("test.todo('AC2.1");
    // Prefix from tests/e2e/tests/admin → tests/e2e/vitest is ../../vitest.
    expect(out).toContain("'../../vitest/browser-fixture'");
    // Every rendered AC id round-trips through the extractor.
    expect(extractExistingIds(out)).toEqual(new Set(['AC1.1', 'AC1.2', 'AC2.1']));
  });
});

describe('syncUserStories', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'us-sync-'));
    const docDir = path.join(tmp, 'docs', 'user-stories', 'admin');
    await fs.mkdir(docDir, { recursive: true });
    await fs.writeFile(path.join(docDir, 'login.md'), SAMPLE);
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('reports a spec to create in check mode without writing', async () => {
    const results = await syncUserStories({ input: 'docs/user-stories', cwd: tmp, write: false });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      status: 'create',
      specPath: 'tests/e2e/tests/admin/login.vitest.spec.ts',
      wrote: false,
    });
    expect(results[0].missing).toEqual(['AC1.1', 'AC1.2', 'AC2.1']);

    const specAbs = path.join(tmp, 'tests/e2e/tests/admin/login.vitest.spec.ts');
    await expect(fs.access(specAbs)).rejects.toBeDefined();
  });

  it('creates the skeleton with --write, then reports ok on re-check', async () => {
    const created = await syncUserStories({ input: 'docs/user-stories', cwd: tmp, write: true });
    expect(created[0]).toMatchObject({ status: 'create', wrote: true });

    const specAbs = path.join(tmp, 'tests/e2e/tests/admin/login.vitest.spec.ts');
    const spec = await fs.readFile(specAbs, 'utf8');
    expect(spec).toContain("test.todo('AC1.1");

    const recheck = await syncUserStories({ input: 'docs/user-stories', cwd: tmp, write: false });
    expect(recheck[0].status).toBe('ok');
  });

  it('detects drift (missing + orphaned ids) and leaves the spec untouched without --force', async () => {
    const specAbs = path.join(tmp, 'tests/e2e/tests/admin/login.vitest.spec.ts');
    await fs.mkdir(path.dirname(specAbs), { recursive: true });
    // Hand-written spec: implements AC1.1, plus an AC9.9 that no longer exists in the doc.
    const handWritten = `import { describe, test } from 'vitest';
describe('Admin Login', () => {
  test('AC1.1 — login', async () => {});
  test('AC9.9 — gone', async () => {});
});
`;
    await fs.writeFile(specAbs, handWritten);

    const results = await syncUserStories({ input: 'docs/user-stories', cwd: tmp, write: true });
    expect(results[0].status).toBe('drift');
    expect(results[0].missing).toEqual(['AC1.2', 'AC2.1']);
    expect(results[0].orphaned).toEqual(['AC9.9']);
    expect(results[0].wrote).toBe(false);

    // Untouched: the hand-written body survives.
    expect(await fs.readFile(specAbs, 'utf8')).toBe(handWritten);
  });

  it('regenerates a drifted spec when --force is passed', async () => {
    const specAbs = path.join(tmp, 'tests/e2e/tests/admin/login.vitest.spec.ts');
    await fs.mkdir(path.dirname(specAbs), { recursive: true });
    await fs.writeFile(
      specAbs,
      `import { describe, test } from 'vitest';\ndescribe('x', () => { test('AC1.1 — old', async () => {}); });\n`
    );

    const results = await syncUserStories({
      input: 'docs/user-stories',
      cwd: tmp,
      write: true,
      force: true,
    });
    expect(results[0].status).toBe('drift');
    expect(results[0].wrote).toBe(true);

    const spec = await fs.readFile(specAbs, 'utf8');
    expect(extractExistingIds(spec)).toEqual(new Set(['AC1.1', 'AC1.2', 'AC2.1']));
    expect(spec).toContain('AUTO-GENERATED');
  });
});
