import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchPackument, resolveLatestVersion } from '../lib/npm.ts';

import type { RegistryRequest } from '../lib/npm.ts';

function packument(latest: unknown, versions: readonly string[]): unknown {
  return {
    'dist-tags': { latest },
    versions: Object.fromEntries(versions.map((version) => [version, {}])),
  };
}

describe('resolveLatestVersion', () => {
  it('accepts a latest dist-tag that is also the highest stable version', () => {
    assert.equal(
      resolveLatestVersion(packument('5.52.3', ['5.52.1', '5.52.2', '5.52.3'])),
      '5.52.3'
    );
  });

  it('ignores prereleases when comparing', () => {
    assert.equal(
      resolveLatestVersion(
        packument('5.52.3', ['5.52.3', '5.53.0-beta.1', '0.0.0-experimental.x'])
      ),
      '5.52.3'
    );
  });

  it('stops when the dist-tag lags behind the highest published version', () => {
    assert.throws(
      () => resolveLatestVersion(packument('5.52.1', ['5.52.1', '5.52.3'])),
      /the "latest" dist-tag is 5\.52\.1 but the highest published stable version is 5\.52\.3/u
    );
  });

  it('stops when the dist-tag is a prerelease', () => {
    assert.throws(
      () => resolveLatestVersion(packument('5.53.0-beta.1', ['5.52.3'])),
      /not a stable version/u
    );
  });

  it('stops when nothing is published', () => {
    assert.throws(() => resolveLatestVersion(packument('5.52.3', [])), /no published versions/u);
  });

  it('stops when only prereleases are published', () => {
    assert.throws(
      () => resolveLatestVersion(packument('5.52.3', ['0.0.0-experimental.x'])),
      /no stable published version/u
    );
  });

  it('stops when the response is not an object', () => {
    assert.throws(() => resolveLatestVersion(null), /not an object/u);
  });
});

describe('fetchPackument', () => {
  function recording(): { seen: string[]; request: RegistryRequest } {
    const seen: string[] = [];

    return {
      seen,
      async request(url) {
        seen.push(url);

        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      },
    };
  }

  it('encodes the package name and returns the parsed body', async () => {
    const { seen, request } = recording();

    assert.deepEqual(await fetchPackument(request), { ok: true });
    assert.deepEqual(seen, ['https://registry.npmjs.org/%40strapi%2Fstrapi']);
  });

  it('encodes every reserved character, not just the first separator', async () => {
    // A substitution of the one separator a scoped name happens to have leaves anything after it
    // raw, and the request then addresses a path the caller never asked for.
    const { seen, request } = recording();

    await fetchPackument(request, '@scope/name/extra?x=1');

    assert.deepEqual(seen, ['https://registry.npmjs.org/%40scope%2Fname%2Fextra%3Fx%3D1']);
  });

  it('surfaces a registry error', async () => {
    const request: RegistryRequest = async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    await assert.rejects(() => fetchPackument(request), /answered 503/u);
  });
});
