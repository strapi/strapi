import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';
import { Readable } from 'stream';

import { createLocalDirectorySourceProvider } from '..';
import { assertReadStreamBackpressure } from '../../../../__tests__/test-utils';

const minimalMetadata = { strapi: { version: '5.0.0' }, createdAt: new Date().toISOString() };

const minimalSchemaLine = JSON.stringify({
  uid: 'api::test.test',
  kind: 'collectionType',
  modelType: 'contentType',
  modelName: 'test',
  collectionName: 'tests',
  info: {
    singularName: 'test',
    pluralName: 'tests',
    displayName: 'Test',
  },
  options: {},
  pluginOptions: {},
  attributes: {
    title: { type: 'string' },
  },
});

describe('Directory source provider', () => {
  test('bootstrap fails when metadata.json is missing', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-'));
    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await expect(provider.bootstrap({ report: jest.fn() } as never)).rejects.toThrow();
  });

  test('getMetadata and getSchemas after bootstrap', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-'));
    await fs.writeJson(path.join(dir, 'metadata.json'), minimalMetadata);
    await fs.ensureDir(path.join(dir, 'schemas'));
    await fs.writeFile(path.join(dir, 'schemas', 'schemas_00000.jsonl'), `${minimalSchemaLine}\n`);

    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await provider.bootstrap({ report: jest.fn() } as never);

    await expect(provider.getMetadata()).resolves.toMatchObject({ strapi: { version: '5.0.0' } });
    await expect(provider.getSchemas()).resolves.toMatchObject({
      'api::test.test': expect.objectContaining({ uid: 'api::test.test' }),
    });
  });

  test('createAssetsReadStream returns readable', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-'));
    await fs.writeJson(path.join(dir, 'metadata.json'), minimalMetadata);
    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await provider.bootstrap({ report: jest.fn() } as never);

    const stream = provider.createAssetsReadStream();
    expect(stream instanceof Readable).toBe(true);
    stream.destroy();
  });

  test('createAssetsReadStream uses filename fallback when metadata sidecar is missing', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-assets-fallback-'));
    await fs.writeJson(path.join(dir, 'metadata.json'), minimalMetadata);
    await fs.ensureDir(path.join(dir, 'assets', 'uploads'));
    await fs.writeFile(
      path.join(dir, 'assets', 'uploads', 'abc123.jpeg'),
      Buffer.from('jpeg-bytes')
    );

    const report = jest.fn();
    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await provider.bootstrap({ report } as never);

    const assets: Array<{ metadata?: { hash?: string; ext?: string } }> = [];
    const stream = provider.createAssetsReadStream();
    for await (const chunk of stream) {
      assets.push(chunk);
      chunk.stream?.resume();
    }

    expect(assets).toHaveLength(1);
    expect(assets[0].metadata).toMatchObject({
      hash: 'abc123',
      ext: '.jpeg',
      mime: 'image/jpeg',
    });
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'warning',
        details: expect.objectContaining({
          message: expect.stringContaining('Missing asset metadata sidecar'),
        }),
      })
    );
  });

  test('entities read stream pauses under backpressure (slow consumer)', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-bp-'));
    await fs.writeJson(path.join(dir, 'metadata.json'), minimalMetadata);
    await fs.ensureDir(path.join(dir, 'entities'));
    const entityLines = Array.from(
      { length: 25 },
      (_, i) => `${JSON.stringify({ type: 'api::test.test', id: i + 1, data: {} })}\n`
    ).join('');
    await fs.writeFile(path.join(dir, 'entities', 'entities_00000.jsonl'), entityLines);

    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await provider.bootstrap({ report: jest.fn() } as never);

    const stream = provider.createEntitiesReadStream();
    const { sourcePaused, chunks } = await assertReadStreamBackpressure(stream, {
      delayMs: 12,
    });

    expect(sourcePaused).toBe(true);
    expect(chunks).toHaveLength(25);
  }, 8000);

  test('streams entities from jsonl shards in order', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dir-'));
    await fs.writeJson(path.join(dir, 'metadata.json'), minimalMetadata);
    await fs.ensureDir(path.join(dir, 'schemas'));
    await fs.writeFile(path.join(dir, 'schemas', 'schemas_00000.jsonl'), `${minimalSchemaLine}\n`);
    await fs.ensureDir(path.join(dir, 'entities'));
    await fs.writeFile(
      path.join(dir, 'entities', 'entities_00000.jsonl'),
      `${JSON.stringify({ type: 'api::test.test', id: 1, data: {} })}\n`
    );

    const provider = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await provider.bootstrap({ report: jest.fn() } as never);

    const chunks: unknown[] = [];
    const stream = provider.createEntitiesReadStream();
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ type: 'api::test.test', id: 1 });
  });
});
