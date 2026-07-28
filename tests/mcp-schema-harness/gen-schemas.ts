/**
 * Emits the variant schemas as JSON.
 *
 *   npx tsx tests/mcp-schema-harness/gen-schemas.ts              # all variants
 *   npx tsx tests/mcp-schema-harness/gen-schemas.ts current      # one variant
 *   npx tsx tests/mcp-schema-harness/gen-schemas.ts > schemas.json
 *
 * `current` is produced by the real `buildDataSchema`, so this doubles as a quick way to eyeball
 * what the branch advertises to an agent today.
 */
import { buildVariants, type VariantKey } from './variants';

const requested = process.argv.slice(2) as VariantKey[];
const all = buildVariants();

const out = requested.length > 0 ? Object.fromEntries(requested.map((k) => [k, all[k]])) : all;

for (const [key, schema] of Object.entries(out)) {
  if (schema === undefined) {
    throw new Error(`Unknown variant "${key}". Known: ${Object.keys(all).join(', ')}`);
  }
}

// eslint-disable-next-line no-console
console.log(JSON.stringify(requested.length === 1 ? Object.values(out)[0] : out, null, 2));
