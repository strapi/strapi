import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import fs from 'fs-extra';
import tar from 'tar-stream';

import { createLocalFileDestinationProvider } from '..';
import { oversizedLast, oversizedThenMore } from '../../../../__tests__/test-utils';

const readArchiveEntries = async (archivePath: string) => {
  const entries: Record<string, string> = {};
  const extract = tar.extract();

  extract.on('entry', (header, stream, next) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      entries[header.name] = Buffer.concat(chunks).toString('utf8');
      next();
    });
  });

  await pipeline(fs.createReadStream(archivePath), extract);

  return entries;
};

const parseJsonl = (content: string) =>
  content
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line));

describe('Local file destination archive', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dts-file-archive-'));
  });

  afterEach(async () => {
    await fs.remove(tempDirectory);
  });

  test('every JSONL stage is in the archive when close resolves', async () => {
    const outputPath = path.join(tempDirectory, 'export');
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: outputPath },
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    provider.bootstrap({ report: jest.fn() } as never);

    const schemas = [{ uid: 'api::article.article' }];
    const entities = [{ id: 1 }, { id: 2, title: 'two' }];
    const links = [{ kind: 'relation.basic', left: { id: 1 }, right: { id: 2 } }];
    const configuration = [{ type: 'core-store', value: { key: 'a' } }];

    await pipeline(Readable.from(schemas), provider.createSchemasWriteStream());
    await pipeline(Readable.from(entities), provider.createEntitiesWriteStream());
    await pipeline(Readable.from(links), provider.createLinksWriteStream());
    await pipeline(Readable.from(configuration), provider.createConfigurationWriteStream());
    await provider.close();

    const archive = await readArchiveEntries(`${outputPath}.tar`);

    expect(parseJsonl(archive['schemas/schemas_00001.jsonl'])).toEqual(schemas);
    expect(parseJsonl(archive['entities/entities_00001.jsonl'])).toEqual(entities);
    expect(parseJsonl(archive['links/links_00001.jsonl'])).toEqual(links);
    expect(parseJsonl(archive['configuration/configuration_00001.jsonl'])).toEqual(configuration);
    expect(JSON.parse(archive['metadata.json'])).toMatchObject({
      strapi: { version: '5.0.0' },
    });
  });

  test('a stage that crosses maxSizeJsonl starts the next file with the line separator', async () => {
    const outputPath = path.join(tempDirectory, 'export');
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: outputPath, maxSizeJsonl: 10 },
    });

    provider.bootstrap({ report: jest.fn() } as never);

    await pipeline(Readable.from([{ id: 1 }, { id: 2 }]), provider.createEntitiesWriteStream());
    await provider.close();

    const archive = await readArchiveEntries(`${outputPath}.tar`);

    expect(archive['entities/entities_00001.jsonl']).toBe('{"id":1}');
    expect(archive['entities/entities_00002.jsonl']).toBe('\n{"id":2}');
    expect(
      parseJsonl(
        `${archive['entities/entities_00001.jsonl']}\n${archive['entities/entities_00002.jsonl']}`
      )
    ).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test.each([
    ['is the last one', oversizedLast],
    ['is followed by more entities', oversizedThenMore],
  ])('an entity larger than maxSizeJsonl fails the write stream when it %s', async (_, source) => {
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: path.join(tempDirectory, 'export'), maxSizeJsonl: 10 },
    });

    provider.bootstrap({ report: jest.fn() } as never);

    await expect(
      pipeline(Readable.from(source()), provider.createEntitiesWriteStream())
    ).rejects.toThrow('payload too large');
  });
});
