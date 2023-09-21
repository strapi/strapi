import path from 'path';

import { build } from '../src';

build({ cwd: path.resolve(__dirname, '..'), debug: !!process.env.DEBUG }).catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
