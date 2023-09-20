import { check } from '../src';

check().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  process.exit(1);
});
