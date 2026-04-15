import { readFileSync } from 'fs';
import { join } from 'path';

const UTIL_IMPORT =
  /import\s*\{\s*write\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/utils\/writable-async-write['"]/;

/**
 * Static checks on remote transfer handlers: shared `write()` for push/pull streams, and pull
 * `flush()` error handling so fire-and-forget work cannot drift.
 */
describe('Push + remote source — shared writable async write', () => {
  test('push.ts imports write from writable-async-write and uses it for transfer steps', () => {
    const pushSource = readFileSync(join(__dirname, '../push.ts'), 'utf8');
    expect(pushSource).toEqual(expect.stringMatching(UTIL_IMPORT));
    expect(pushSource).toContain('await write(stream, item)');
    expect(pushSource).toContain('for (const item of msg.data)');
    expect(pushSource).not.toMatch(/Promise\.all\(\s*\n?\s*msg\.data\.map\(async \(item\) =>/m);
    expect(pushSource).toContain('await write(assetsStream, this.assets[assetID]);');
    expect(pushSource).toContain('await write(this.assets[assetID].stream, chunk)');
    expect(pushSource).not.toMatch(/\bwriteWithBackpressure\b/);
  });

  test('remote-source imports write from writable-async-write and uses it for asset rows', () => {
    const remoteSource = readFileSync(
      join(__dirname, '../../../providers/remote-source/index.ts'),
      'utf8'
    );
    expect(remoteSource).toEqual(expect.stringMatching(UTIL_IMPORT));
    expect(remoteSource).toContain('await write(pass, assets[assetID]);');
    expect(remoteSource).toContain('await write(asset.stream, chunk)');
    expect(remoteSource).not.toMatch(/\bwriteWithBackpressure\b/);
  });
});

describe('Pull handler — flush lifecycle', () => {
  test('start step chains Promise.resolve(flush) with .catch and keeps missing-stream check inside try', () => {
    const pullSource = readFileSync(join(__dirname, '../pull.ts'), 'utf8');
    expect(pullSource).toContain('Promise.resolve(this.flush(step, flushUUID)).catch');
    const streamGuard = pullSource.indexOf('if (!stream) {');
    const flushTry = pullSource.indexOf(
      'try {',
      pullSource.indexOf('async flush(this: PullHandler')
    );
    expect(flushTry).toBeGreaterThan(-1);
    expect(streamGuard).toBeGreaterThan(flushTry);
  });
});
