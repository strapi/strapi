import { readFileSync } from 'fs';
import { join } from 'path';

const UTIL_IMPORT =
  /import\s*\{\s*write\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/utils\/writable-async-write['"]/;

/** Static checks: shared `write()` import/usage and pull `flush` wiring. */
describe('writable-async-write usage (push, remote-source, pull)', () => {
  test('push.ts', () => {
    const pushSource = readFileSync(join(__dirname, '../push.ts'), 'utf8');
    expect(pushSource).toEqual(expect.stringMatching(UTIL_IMPORT));
    expect(pushSource).toContain('await write(stream, item)');
    expect(pushSource).toContain('for (const item of msg.data)');
    expect(pushSource).not.toMatch(/Promise\.all\(\s*\n?\s*msg\.data\.map\(async \(item\) =>/m);
    expect(pushSource).toContain('await write(assetsStream, this.assets[assetID]);');
    expect(pushSource).toContain('await write(this.assets[assetID].stream, chunk)');
    expect(pushSource).toContain("else if (action === 'stream' || action === 'end')");
    expect(pushSource).toContain('send start before stream/end');
    expect(pushSource).not.toMatch(/\bwriteWithBackpressure\b/);
  });

  test('remote-source', () => {
    const remoteSource = readFileSync(
      join(__dirname, '../../../providers/remote-source/index.ts'),
      'utf8'
    );
    expect(remoteSource).toEqual(expect.stringMatching(UTIL_IMPORT));
    expect(remoteSource).toContain('await write(pass, assets[assetID]);');
    expect(remoteSource).toContain('await write(asset.stream, chunk)');
    expect(remoteSource).not.toMatch(/\bwriteWithBackpressure\b/);
  });

  test('push and remote-source asset batch shape', () => {
    const pushSource = readFileSync(join(__dirname, '../push.ts'), 'utf8');
    const remoteSource = readFileSync(
      join(__dirname, '../../../providers/remote-source/index.ts'),
      'utf8'
    );
    expect(pushSource).toContain("else if (action === 'stream' || action === 'end')");
    expect(remoteSource).toContain("} else if (action === 'stream' || action === 'end') {");
    expect(remoteSource).toContain('No id matching');
    expect(pushSource).toContain('No asset "');
    expect(pushSource).toContain('send start before stream/end');
  });
});

describe('Pull handler flush', () => {
  test('start step awaits flush with .catch; missing stream checked inside try', () => {
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
