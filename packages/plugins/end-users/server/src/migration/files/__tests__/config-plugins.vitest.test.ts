import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  createPluginsConfig,
  endUsersConfigBlock,
  switchPluginsConfig,
  USERS_PERMISSIONS_LINE,
  type UsersPermissionsSettings,
} from '../config-plugins';

const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, 'fixtures', 'config-plugins', file), 'utf8');

const env = Object.assign((name: string) => `env:${name}`, {
  int: (name: string) => `env:${name}`,
});

/** Runs the file as the project would load it: `env()` answers with the name it was asked for */
const evaluate = (code: string, typescript = true): Record<string, any> => {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
    fileName: typescript ? 'plugins.ts' : 'plugins.js',
  });
  const module = { exports: {} as any };

  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: () => ({}),
    process: { env: { JWT_SECRET: 'env-var' } },
  });

  const exported = module.exports.default ?? module.exports;

  return typeof exported === 'function' ? exported({ env }) : exported;
};

const settings = (overrides: Partial<UsersPermissionsSettings> = {}): UsersPermissionsSettings => ({
  config: {},
  jwtSecretFromEnv: true,
  callbacks: null,
  ...overrides,
});

const plan = async (file: string, name: string, given = settings()) => {
  const source = read(file);
  const { block, findings } = await endUsersConfigBlock(given, source, { path: name });
  const switched = await switchPluginsConfig(name, source, block);

  return { source, block, findings, after: switched.after, switchFindings: switched.findings };
};

describe('config/plugins', () => {
  it('disables users-permissions, keeps its config, and adds end-users with compat, the legacy secret and the migration keys', async () => {
    const { source, after, findings } = await plan('arrow.ts.txt', 'config/plugins.ts');

    expect(after).not.toBeNull();

    const before = evaluate(source);
    const result = evaluate(after!);

    // the functions in the config are compared by their text
    expect(JSON.parse(JSON.stringify(result['users-permissions']))).toEqual({
      ...JSON.parse(JSON.stringify(before['users-permissions'])),
      enabled: false,
    });
    expect(String(result['users-permissions'].config.validationRules.validatePassword)).toBe(
      String(before['users-permissions'].config.validationRules.validatePassword)
    );
    expect(result.email).toEqual(before.email);
    expect(result['end-users']).toEqual({
      enabled: true,
      config: {
        secret: 'env:END_USERS_SECRET',
        compat: {
          usersPermissions: true,
          legacyJwt: { secret: 'env:JWT_SECRET', until: null, algorithm: 'HS512' },
          refresh: {
            enabled: true,
            httpOnly: true,
            cookie: { name: 'shop_refresh', sameSite: 'strict' },
          },
        },
        rateLimit: { window: 120, max: 5 },
        session: { expiresIn: 2592000, updateAge: 604800 },
        migration: { fromUsersPermissions: true, registrationFields: ['nickname'] },
      },
    });
    expect(after).toContain("secret: env('END_USERS_SECRET')");
    expect(findings.map(({ rule }) => rule)).toEqual(['secret-to-set', 'validate-password']);
    expect(findings[1].line).toBe(16);
  });

  it('maps jwtManagement refresh, the session cookie and ratelimit', async () => {
    const { block } = await plan('arrow.ts.txt', 'config/plugins.ts');

    expect(block).toContain('enabled: true,\n        httpOnly: true,');
    expect(block).toContain("name: 'shop_refresh'");
    expect(block).toContain('window: 120');

    const legacy = await endUsersConfigBlock(
      settings(),
      "export default () => ({ 'users-permissions': { config: { jwtManagement: 'legacy-support', jwt: { expiresIn: '14d' } } } });",
      { path: 'config/plugins.ts' }
    );

    expect(legacy.block).toContain('enabled: false');
    expect(legacy.block).toContain("expiresIn: '14d'");
  });

  it('writes the provider callbacks it is given', async () => {
    const { block } = await endUsersConfigBlock(
      settings({ callbacks: { github: 'https://app.example.com/connect/github' } }),
      null
    );

    expect(block).toContain("callbacks: { github: 'https://app.example.com/connect/github' }");
  });

  it('keeps env() calls and never writes a secret value', async () => {
    const secret = randomBytes(16).toString('hex');
    const live = settings({
      config: {
        jwtSecret: secret,
        jwt: { expiresIn: '30d' },
        jwtManagement: 'legacy-support',
        ratelimit: { interval: 60000, max: 10 },
      },
      jwtSecretFromEnv: false,
    });

    const fromLive = await endUsersConfigBlock(live, null);

    expect(fromLive.block).not.toContain(secret);
    expect(fromLive.block).toContain("secret: env('END_USERS_SECRET')");
    expect(fromLive.block).toContain("secret: env('JWT_SECRET')");
    expect(fromLive.block).toContain("expiresIn: '30d'");
    expect(fromLive.block).toContain('window: 60');
    expect(fromLive.findings.map(({ rule }) => rule)).toEqual(['secret-to-set', 'legacy-secret']);
    expect(JSON.stringify(fromLive.findings)).not.toContain(secret);

    // a file that does not parse into something readable falls back to the live config
    const unreadable = await endUsersConfigBlock(live, 'export default () => shared;');

    expect(unreadable.block).toBe(fromLive.block);

    const { block, after } = await plan('body.js.txt', 'config/plugins.js', live);

    expect(block).toContain("secret: env('SHOP_JWT_SECRET')");
    expect(block).toContain("expiresIn: env('JWT_EXPIRES_IN', '30d')");
    expect(block).toContain("window: Math.ceil((env.int('RATE_MS', 60000)) / 1000)");
    expect(block).not.toContain(secret);
    expect(after).not.toContain(secret);
  });

  it('never turns a live secret into text, whichever way the file is read', async () => {
    const secret = randomBytes(16).toString('hex');
    const live = settings({
      config: { jwtSecret: secret, jwt: { expiresIn: '30d' } },
      jwtSecretFromEnv: false,
    });
    const sources: Array<string | null> = [
      read('arrow.ts.txt'),
      "export default ({ env }) => ({ 'users-permissions': { config: { jwt: { expiresIn: '7d' } } } });",
      "export default ({ env }) => ({ 'users-permissions': { config: { ...shared, jwtManagement: 'refresh' } } });",
      "export default ({ env }) => ({ 'users-permissions': { config: { ...shared } } });",
      null,
    ];

    for (const source of sources) {
      const { block, findings } = await endUsersConfigBlock(live, source);
      const switched =
        source === null ? null : await switchPluginsConfig('config/plugins.ts', source, block);

      expect(block).toContain('compat');
      expect(block).not.toContain(secret);
      expect(JSON.stringify(findings)).not.toContain(secret);
      expect(switched?.after ?? '').not.toContain(secret);
      expect(JSON.stringify(switched?.findings ?? [])).not.toContain(secret);
    }

    const opaque = await endUsersConfigBlock(live, sources[3]);

    expect(opaque.block).toContain("secret: env('JWT_SECRET')");
    expect(opaque.findings.map(({ rule }) => rule)).toContain('legacy-secret');
  });

  it('handles an object literal, an arrow function returning one, and a function with a body', async () => {
    const literal = await plan('literal.js.txt', 'config/plugins.js');

    expect(literal.after).toContain('module.exports = ({ env }) => ({');
    expect(literal.after).toMatch(/\}\);\n$/);

    const fromLiteral = evaluate(literal.after!, false);

    expect(fromLiteral['users-permissions'].enabled).toBe(false);
    expect(fromLiteral['users-permissions'].config).toEqual({ jwtSecret: 'env-var' });
    expect(fromLiteral.upload).toEqual({});
    expect(fromLiteral['end-users'].config.compat.legacyJwt.secret).toBe('env-var');

    const body = await plan('body.js.txt', 'config/plugins.js');
    const fromBody = evaluate(body.after!, false);

    expect(fromBody['users-permissions'].enabled).toBe(false);
    expect(fromBody['users-permissions'].config.siteName).toBe('env:SITE_NAME');
    expect(fromBody['end-users'].enabled).toBe(true);
    expect(body.findings.map(({ rule }) => rule)).toEqual([
      'secret-to-set',
      'unknown-config-key',
      'unknown-config-key',
    ]);
    expect(body.findings[1].message).toContain('ratelimit.delayAfter');
    expect(body.findings[2].message).toContain('siteName');

    const arrow = await plan('arrow.ts.txt', 'config/plugins.ts');

    expect(evaluate(arrow.after!)['end-users'].enabled).toBe(true);
  });

  it('leaves a config built from a variable alone and reports it', async () => {
    for (const file of ['variable.ts.txt', 'spread.ts.txt']) {
      const { after, switchFindings: findings } = await plan(file, 'config/plugins.ts');

      expect(after).toBeNull();
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ rule: 'config-not-editable', path: 'config/plugins.ts' });
      expect(findings[0].message).toContain(USERS_PERMISSIONS_LINE);
    }
  });

  it('maps an environment file without the migration keys', async () => {
    const file = 'config/env/production/plugins.ts';
    const source = read('production.ts.txt');
    const { block, findings } = await endUsersConfigBlock(settings(), source, {
      path: file,
      environment: true,
    });

    expect(findings).toEqual([]);
    expect(block).not.toContain('migration');
    expect(block).not.toContain('END_USERS_SECRET');
    expect(block).not.toContain('usersPermissions');
    expect(block).toContain("secret: env('PROD_JWT_SECRET')");

    const { after } = await switchPluginsConfig(file, source, block);
    const result = evaluate(after!);

    // the environment file leaves users-permissions as it is
    expect(result['users-permissions']).toEqual(evaluate(source)['users-permissions']);
    expect(result['end-users'].config).toEqual({
      compat: { legacyJwt: { secret: 'env:PROD_JWT_SECRET' } },
      rateLimit: { max: 3 },
    });

    const none = await endUsersConfigBlock(settings(), read('production-unrelated.ts.txt'), {
      path: file,
      environment: true,
    });

    expect(none.block).toBe('');
    expect(await switchPluginsConfig(file, read('production-unrelated.ts.txt'), '')).toEqual({
      after: read('production-unrelated.ts.txt'),
      findings: [],
    });
  });

  it('creates config/plugins.ts in a TypeScript project', async () => {
    const { block } = await endUsersConfigBlock(settings(), null);

    const created = createPluginsConfig(true, block);

    expect(created.startsWith('export default ({ env }) => ({')).toBe(true);
    expect(created).toContain(USERS_PERMISSIONS_LINE);
    expect(evaluate(created)['end-users'].config.secret).toBe('env:END_USERS_SECRET');
    expect(evaluate(created)['users-permissions']).toEqual({ enabled: false });

    const javascript = createPluginsConfig(false, block);

    expect(javascript.startsWith('module.exports = ({ env }) => ({')).toBe(true);
    expect(evaluate(javascript, false)['end-users'].enabled).toBe(true);
  });

  it('changes nothing the second time it runs', async () => {
    for (const [file, name] of [
      ['arrow.ts.txt', 'config/plugins.ts'],
      ['body.js.txt', 'config/plugins.js'],
      ['literal.js.txt', 'config/plugins.js'],
    ] as const) {
      const first = await plan(file, name);
      const { block } = await endUsersConfigBlock(settings(), first.after, { path: name });
      const second = await switchPluginsConfig(name, first.after!, block);

      expect(second.after).toBe(first.after);
    }

    // an entry that is already there is replaced by the block, not added again
    const stale = await plan('already.ts.txt', 'config/plugins.ts');
    const result = evaluate(stale.after!);

    expect(Object.keys(result).filter((key) => key === 'end-users')).toHaveLength(1);
    expect(result['end-users'].config.legacy).toBeUndefined();
    expect(result['users-permissions'].enabled).toBe(false);
  });
});
