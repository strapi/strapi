import path from 'node:path';
import { createAppTmpDirMatcher } from '../develop';

describe('createAppTmpDirMatcher', () => {
  test.each(['/private/tmp/app', '/tmp/app', '/home/u/tmpapps/app'])(
    'does not ignore app source files when the app dir is %s',
    (appDir) => {
      const isIgnored = createAppTmpDirMatcher(appDir);

      expect(isIgnored(appDir)).toBe(false);
      expect(isIgnored(path.join(appDir, 'src/api/x.ts'))).toBe(false);
      expect(isIgnored(path.join(appDir, 'config/server.ts'))).toBe(false);
      expect(isIgnored(path.join(appDir, 'src/api/tmp-helper/index.ts'))).toBe(false);
    }
  );

  test.each(['/private/tmp/app', '/home/u/app'])('ignores the app tmp folders in %s', (appDir) => {
    const isIgnored = createAppTmpDirMatcher(appDir);

    expect(isIgnored(path.join(appDir, '.tmp'))).toBe(true);
    expect(isIgnored(path.join(appDir, '.tmp/data.db'))).toBe(true);
    expect(isIgnored(path.join(appDir, 'tmp'))).toBe(true);
    expect(isIgnored(path.join(appDir, 'tmp/file.json'))).toBe(true);
  });

  test('does not match paths outside the app dir', () => {
    expect(createAppTmpDirMatcher('/home/u/app')('/home/u/.tmp/x')).toBe(false);
  });
});
