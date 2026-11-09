import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Core } from '@strapi/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { planProjectFiles, publicProjectFiles } from '../plan';
import { writeProjectFiles } from '../write';

const PROFILE = 'src/extensions/end-users/content-types/profile/schema.json';
const UP_USER = 'src/extensions/users-permissions/content-types/user/schema.json';
const MEMO = 'src/api/memo/content-types/memo/schema.json';

let root: string;
// Built at run time: a secret-shaped value that exists only in the live config
const liveSecret = randomBytes(24).toString('hex');

const put = (relative: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), text);
};

const liveConfig = (key: string) => {
  if (key === 'autoReload') return true;

  return key === 'plugin::users-permissions'
    ? { jwtSecret: liveSecret, jwt: { expiresIn: '7d' } }
    : undefined;
};

const makeStrapi = () =>
  ({
    dirs: {
      app: { root, src: path.join(root, 'src'), config: path.join(root, 'config') },
    },
    config: { get: liveConfig },
    store: () => ({ get: async () => ({ github: { callback: 'https://app.example.test/cb' } }) }),
  }) as unknown as Core.Strapi;

const writeProject = () => {
  put(
    UP_USER,
    JSON.stringify({
      kind: 'collectionType',
      collectionName: 'up_users',
      info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
      options: {},
      attributes: {
        username: { type: 'string' },
        email: { type: 'email' },
        company: { type: 'string' },
        memos: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::memo.memo',
          mappedBy: 'author',
        },
      },
    })
  );
  put(
    MEMO,
    JSON.stringify({
      kind: 'collectionType',
      collectionName: 'memos',
      info: { singularName: 'memo', pluralName: 'memos', displayName: 'Memo' },
      options: {},
      attributes: {
        title: { type: 'string' },
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.user',
          inversedBy: 'memos',
        },
      },
    })
  );
  put(
    'config/plugins.ts',
    `export default () => ({\n  'users-permissions': { config: { jwtSecret: 'x' } },\n});\n`
  );
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-plan-'));
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('planProjectFiles', () => {
  it('plans the profile extension, the memo schema and the config for a fixture project, and no change twice', async () => {
    writeProject();

    const plan = await planProjectFiles(makeStrapi());

    expect(plan.writable).toBe(true);
    expect(plan.reason).toBeNull();
    expect(plan.changes.map((change) => change.path).sort((a, b) => a.localeCompare(b))).toEqual([
      MEMO,
      PROFILE,
      UP_USER,
    ]);
    expect(plan.configChange?.path).toBe('config/plugins.ts');
    expect(plan.configBlock).toContain('fromUsersPermissions: true');
    expect(plan.configChange?.after).toContain('fromUsersPermissions: true');
    expect(plan.usersPermissionsLine).toContain('enabled: false');

    const profile = JSON.parse(plan.changes.find((change) => change.path === PROFILE)?.after ?? '');

    expect(Object.keys(profile.attributes)).toEqual(expect.arrayContaining(['user', 'company']));

    await writeProjectFiles(root, [
      ...plan.changes,
      ...(plan.configChange ? [plan.configChange] : []),
    ]);

    const again = await planProjectFiles(makeStrapi());

    expect(again.changes).toEqual([]);
    expect(again.configChange).toBeNull();
  });

  it('returns no change and says so when the project has no src folder', async () => {
    const plan = await planProjectFiles(makeStrapi());

    expect(plan).toMatchObject({
      writable: false,
      reason: 'no-source',
      changes: [],
      configChange: null,
    });
    expect(plan.findings.map((finding) => finding.rule)).toEqual(['no-source']);
  });

  it('is not writable outside development, and says why first', async () => {
    writeProject();
    vi.stubEnv('NODE_ENV', 'production');

    const plan = await planProjectFiles(makeStrapi());

    expect(plan).toMatchObject({ writable: false, reason: 'not-development' });
    expect(plan.changes.length).toBeGreaterThan(0);
  });

  it('says a config it cannot edit is not editable', async () => {
    writeProject();
    put('config/plugins.ts', `const plugins = {};\nexport default () => plugins;\n`);

    const plan = await planProjectFiles(makeStrapi());

    expect(plan).toMatchObject({
      writable: false,
      reason: 'config-not-editable',
      configChange: null,
    });
  });

  it('never returns the config file or a resolved secret', async () => {
    writeProject();

    const plan = await planProjectFiles(makeStrapi());
    const sent = JSON.stringify(publicProjectFiles(plan));

    expect(sent).not.toContain('configChange');
    expect(publicProjectFiles(plan).changes.map((change) => change.path)).not.toContain(
      plan.configChange?.path
    );
    expect(sent).not.toContain('export default');
    expect(sent).not.toContain(liveSecret);
    expect(JSON.stringify(plan)).not.toContain(liveSecret);
    expect(plan.configBlock).toContain('env(');
  });

  it('shows a secret the config writes as a literal as an env call, and says so', async () => {
    writeProject();
    const literal = randomBytes(18).toString('hex');

    put(
      'config/plugins.ts',
      `export default () => ({\n  'users-permissions': { config: { jwtSecret: '${literal}' } },\n});\n`
    );

    const plan = await planProjectFiles(makeStrapi());
    const shown = publicProjectFiles(plan);

    // the file the server writes keeps the project's own text
    expect(plan.configBlock).toContain(literal);
    expect(JSON.stringify(shown)).not.toContain(literal);
    expect(shown.configBlock).toContain("secret: env('JWT_SECRET')");
    expect(shown.findings.some((finding) => finding.rule === 'legacy-secret')).toBe(true);
  });
});
