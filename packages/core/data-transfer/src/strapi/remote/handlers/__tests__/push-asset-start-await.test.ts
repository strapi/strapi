import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression: push destination must await enqueueing each asset on the assets stage Writable
 * before writing chunks into the asset's PassThrough — same contract as
 * `remote-source` (`await this.writeAsync(pass, assets[assetID])`).
 */
describe('Push handler — asset start / backpressure parity', () => {
  test('push.ts awaits writeAsync when enqueueing a new asset on the assets stream', () => {
    const pushSource = readFileSync(join(__dirname, '../push.ts'), 'utf8');
    expect(pushSource).toContain('await writeAsync(assetsStream, this.assets[assetID]);');
  });

  test('remote-source awaits writeAsync when forwarding a new asset (parity reference)', () => {
    const remoteSource = readFileSync(
      join(__dirname, '../../../providers/remote-source/index.ts'),
      'utf8'
    );
    expect(remoteSource).toContain('await this.writeAsync(pass, assets[assetID]);');
  });
});
