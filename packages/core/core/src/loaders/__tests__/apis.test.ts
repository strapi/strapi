import * as os from 'os';
import * as path from 'path';
import * as fse from 'fs-extra';
import type { Core } from '@strapi/types';
import loadAPIs from '../apis';

const schema = (singularName: string, pluralName: string) => ({
  kind: 'collectionType',
  collectionName: pluralName,
  info: { singularName, pluralName, displayName: singularName },
  attributes: {},
});

describe('Loaders | apis', () => {
  let apiDir: string;
  let apis: Record<string, unknown>;

  const apiFile = (...segments: string[]) => path.join(apiDir, ...segments);

  const load = () =>
    loadAPIs({
      dirs: { dist: { api: apiDir } },
      get(name: string) {
        if (name !== 'apis') {
          throw new Error(`Unexpected container lookup: ${name}`);
        }
        return {
          add(key: string, value: unknown) {
            apis[key] = value;
          },
        };
      },
    } as unknown as Core.Strapi);

  beforeEach(async () => {
    apiDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-load-apis-'));
    apis = {};

    await fse.outputJSON(
      apiFile('test', 'content-types', 'test', 'schema.json'),
      schema('test', 'tests')
    );
  });

  afterEach(async () => {
    await fse.remove(apiDir);
  });

  it('loads a content type from its schema.json', async () => {
    await load();

    expect(apis.test).toMatchObject({
      contentTypes: { test: { schema: { apiName: 'test', collectionName: 'tests' } } },
    });
  });

  it('ignores files it cannot parse instead of registering them as empty entries', async () => {
    await fse.outputFile(apiFile('test', 'controllers', 'test.js.orig'), 'not javascript');
    await fse.outputFile(apiFile('test', 'controllers', 'test.js.map'), '{}');
    await fse.outputFile(apiFile('test', 'controllers', 'README.md'), '# notes');

    await load();

    expect((apis.test as any).controllers).toEqual({});
  });

  it('names the offending folder when a content type has no schema', async () => {
    await fse.remove(apiFile('test', 'content-types', 'test', 'schema.json'));
    await fse.outputFile(apiFile('test', 'content-types', 'test', 'test.js.orig'), 'leftover');

    await expect(load()).rejects.toThrow(apiFile('test', 'content-types', 'test'));
  });
});
