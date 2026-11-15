import fs from 'fs';
import path from 'path';

import packageJson from '../../../package.json';

const packageRoot = path.resolve(__dirname, '../../..');

const sourceExports = Object.entries(packageJson.exports).flatMap(([subpath, conditions]) =>
  typeof conditions === 'object' && 'source' in conditions ? [[subpath, conditions.source]] : []
);

describe('package exports', () => {
  test.each(sourceExports)('%s source condition points to an existing file', (_subpath, source) => {
    expect(fs.existsSync(path.join(packageRoot, source))).toBe(true);
  });
});
