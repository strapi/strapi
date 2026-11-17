import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { scanCode } from '../code';

const read = (file: string) =>
  fs.readFileSync(path.join(__dirname, 'fixtures', 'code', file), 'utf8');

describe('scanCode', () => {
  it('reports the old user uid, plugin services, custom providers and lifecycles with their lines', () => {
    const index = scanCode('src/index.js', read('src/index.js'));

    expect(index.map(({ rule, line }) => [rule, line])).toEqual([
      ['plugin-service', 5],
      ['plugin-service', 6],
      ['lifecycle', 11],
      ['lifecycle', 15],
      ['old-uid', 21],
    ]);
    expect(index.every((finding) => finding.path === 'src/index.js')).toBe(true);

    const providers = scanCode(
      'src/extensions/users-permissions/providers.js',
      read('src/extensions/users-permissions/providers.js')
    );

    expect(providers.map(({ rule, line }) => [rule, line])).toEqual([['custom-provider', 1]]);
  });

  it('leaves other files alone and changes nothing', () => {
    const source = read('src/index.js');

    expect(scanCode('config/plugins.ts', source)).toEqual([]);
    expect(scanCode('src/readme.md', source)).toEqual([]);
    expect(read('src/index.js')).toBe(source);
  });
});
