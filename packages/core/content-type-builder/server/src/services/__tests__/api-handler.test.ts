import * as os from 'os';
import * as path from 'path';
import * as fse from 'fs-extra';
import type { Internal } from '@strapi/types';
import { backup, clear } from '../api-handler';

const UID = 'api::test.test' as Internal.UID.ContentType;

describe('API handler service', () => {
  let apiDir: string;

  const apiFile = (...segments: string[]) => path.join(apiDir, 'test', ...segments);

  beforeEach(async () => {
    apiDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-api-handler-'));

    await fse.outputJSON(apiFile('content-types', 'test', 'schema.json'), {
      kind: 'collectionType',
      info: { singularName: 'test', pluralName: 'tests', displayName: 'Test' },
      attributes: {},
    });
    await fse.outputFile(apiFile('controllers', 'test.js'), '');
    await fse.outputFile(apiFile('services', 'test.js'), '');
    await fse.outputFile(apiFile('routes', 'test.js'), '');

    global.strapi = {
      contentTypes: { [UID]: { apiName: 'test', modelName: 'test' } },
      dirs: { app: { api: apiDir } },
    } as any;
  });

  afterEach(async () => {
    await fse.remove(apiDir);
  });

  it('removes the whole API folder of the content type', async () => {
    await backup(UID);
    await clear(UID);

    expect(await fse.pathExists(path.join(apiDir, 'test'))).toBe(false);
  });

  // The content type folder must not survive its schema.json, otherwise the server
  // fails to boot with "Could not load content type found at ...".
  // https://github.com/strapi/strapi/issues/17360
  it.each([
    ['a file with a multi-dot name', 'test.js.orig'],
    ['a file unrelated to the content type', 'notes.txt'],
    ['a dotfile', '.keep'],
  ])('removes the content type folder when it also holds %s', async (_label, fileName) => {
    await fse.outputFile(apiFile('content-types', 'test', fileName), 'leftover');

    await backup(UID);
    await clear(UID);

    expect(await fse.pathExists(apiFile('content-types', 'test'))).toBe(false);
  });

  it('leaves files belonging to another content type of the same API untouched', async () => {
    await fse.outputJSON(apiFile('content-types', 'other', 'schema.json'), { attributes: {} });
    await fse.outputFile(apiFile('controllers', 'other.js'), '');

    await backup(UID);
    await clear(UID);

    expect(await fse.pathExists(apiFile('content-types', 'other', 'schema.json'))).toBe(true);
    expect(await fse.pathExists(apiFile('controllers', 'other.js'))).toBe(true);
    expect(await fse.pathExists(apiFile('content-types', 'test'))).toBe(false);
    expect(await fse.pathExists(apiFile('controllers', 'test.js'))).toBe(false);
  });
});
