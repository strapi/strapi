import path from 'path';

import { watch } from '../src';

watch({ cwd: path.resolve(__dirname, '..'), debug: !!process.env.DEBUG }).catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
