import path from 'node:path';

import { isArtifactPathUnderAppRoot } from '../performance-snapshot';

describe('isArtifactPathUnderAppRoot', () => {
  const appRoot = path.resolve('/var/www/my-strapi-app');

  it('accepts a file under the app root', () => {
    expect(isArtifactPathUnderAppRoot(appRoot, path.join(appRoot, '.tmp', 'perf.jsonl'))).toBe(
      true
    );
  });

  it('rejects paths that escape the app root', () => {
    expect(isArtifactPathUnderAppRoot(appRoot, path.join(appRoot, '..', 'etc', 'passwd'))).toBe(
      false
    );
  });

  it('rejects absolute paths outside the app root', () => {
    expect(isArtifactPathUnderAppRoot(appRoot, '/etc/passwd')).toBe(false);
  });
});
