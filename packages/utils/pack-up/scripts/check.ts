import { check } from '../src';

check().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
