import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  runInServer,
  scaffoldContentType,
  scaffoldDependency,
  scaffoldServerScript,
  ServerScriptError,
  stopAllServers,
  type App,
} from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../helpers';

let ctx: TestApp;

const run = <T = unknown>(action: string, args?: unknown) =>
  runInServer<T>(ctx.server, 'self-test', action, args);

beforeAll(async () => {
  ctx = await setupApp({
    name: 'server-scripts',
    scaffold(app) {
      scaffoldServerScript(app, path.join(__dirname, 'server/self-test.js'));
    },
  });
});

afterAll(stopAllServers);

describe('server scripts', () => {
  test('the hooks run in the register and bootstrap phases, before the load ends', async () => {
    expect(await run('phases')).toEqual([
      { hook: 'register', isLoaded: false },
      { hook: 'bootstrap', isLoaded: false },
    ]);
  });

  test('an action gets its args and the server, and returns JSON', async () => {
    const { args, appName } = await run<{ args: unknown; appName: unknown }>('echo', {
      list: [1, 'a', null],
    });

    expect(args).toEqual({ list: [1, 'a', null] });
    expect(appName).toBe(ctx.app.name);
  });

  test('module state is kept between actions', async () => {
    await run('increment', { by: 2 });

    expect(await run('increment', { by: 3 })).toBe(5);
  });

  test('an action that returns nothing answers null', async () => {
    expect(await run('nothing')).toBeNull();
  });

  test('a thrown error keeps its name, message, details and server stack', async () => {
    const error = await run('throwValidation').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServerScriptError);
    expect(error).toMatchObject({
      name: 'ValidationError',
      message: 'Invalid title',
      details: { path: ['title'] },
    });
    expect((error as ServerScriptError).serverStack).toContain('self-test.js');
  });

  test('an unknown script or action names what exists', async () => {
    await expect(runInServer(ctx.server, 'missing', 'phases')).rejects.toMatchObject({
      name: 'TestScriptError',
      message: 'Unknown server script "missing". Scaffolded: self-test.',
    });
    await expect(run('missing')).rejects.toMatchObject({
      name: 'TestScriptError',
      message: expect.stringContaining('has no action "missing". Actions: phases, increment'),
    });
  });
});

describe('scaffolders', () => {
  test('a content type routed at /api/tests is refused: it would hide the test plugin', () => {
    expect(() =>
      scaffoldContentType(ctx.app, { singularName: 'test', pluralName: 'tests', attributes: {} })
    ).toThrow('A content type routed at /api/tests hides the test plugin');
    expect(() =>
      scaffoldContentType(ctx.app, {
        singularName: 'tests',
        kind: 'singleType',
        attributes: {},
      })
    ).toThrow('A content type routed at /api/tests hides the test plugin');
  });

  test('scaffoldDependency adds a repo package at its workspace version', () => {
    const app: App = ctx.app;
    const packageFile = path.join(app.dir, 'package.json');
    const before = fs.readFileSync(packageFile, 'utf8');

    try {
      scaffoldDependency(app, '@strapi/plugin-graphql');
      const { version } = JSON.parse(
        fs.readFileSync(require.resolve('@strapi/strapi/package.json'), 'utf8')
      );

      expect(JSON.parse(fs.readFileSync(packageFile, 'utf8')).dependencies).toMatchObject({
        '@strapi/plugin-graphql': version,
      });
      expect(() => scaffoldDependency(app, '@strapi/not-a-package')).toThrow(
        '@strapi/not-a-package is not a package of the repo'
      );
    } finally {
      fs.writeFileSync(packageFile, before);
    }
  });
});
