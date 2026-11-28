import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveArtifactPath } from '../resolve-artifact-path';

const appRoot = path.resolve('/srv/my-app');

describe('resolveArtifactPath', () => {
  it('resolves a relative path against the app root', () => {
    expect(resolveArtifactPath('schema.graphql', appRoot)).toBe(
      path.join(appRoot, 'schema.graphql')
    );
    expect(resolveArtifactPath('./types/generated.d.ts', appRoot)).toBe(
      path.join(appRoot, 'types', 'generated.d.ts')
    );
  });

  it('leaves an absolute path unchanged', () => {
    const absolute = path.resolve('/tmp/out/schema.graphql');

    expect(resolveArtifactPath(absolute, appRoot)).toBe(absolute);
  });

  it('leaves booleans unchanged', () => {
    expect(resolveArtifactPath(true, appRoot)).toBe(true);
    expect(resolveArtifactPath(false, appRoot)).toBe(false);
  });
});
