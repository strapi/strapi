import { bench, describe } from 'vitest';

import parseType from '../parse-type';

const values: Array<{ type: string; value: unknown }> = [
  { type: 'boolean', value: 'true' },
  { type: 'boolean', value: '0' },
  { type: 'integer', value: '42' },
  { type: 'biginteger', value: '9007199254740993' },
  { type: 'float', value: '3.14159' },
  { type: 'decimal', value: '10.5' },
  { type: 'time', value: '12:34:56.789' },
  { type: 'date', value: '2024-03-17' },
  { type: 'datetime', value: '2024-03-17T15:06:57.878Z' },
  { type: 'timestamp', value: '2024-03-17T15:06:57.878Z' },
  { type: 'string', value: 'hello' },
];

describe('parseType', () => {
  bench('parseType - all scalar types', () => {
    for (const { type, value } of values) {
      parseType({ type: type as any, value });
    }
  });
});
