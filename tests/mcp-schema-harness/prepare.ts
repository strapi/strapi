/**
 * Builds the `args.bundle` the workflow needs.
 *
 * A workflow script is plain JS with no filesystem or TypeScript imports, so the schemas and
 * scenarios have to be handed in as data. This prints them as JSON:
 *
 *   npx tsx tests/mcp-schema-harness/prepare.ts            # print the bundle
 *   npx tsx tests/mcp-schema-harness/prepare.ts --wrap     # print full Workflow args
 *
 * Then run the harness with the printed object as `args.bundle` (see README).
 */
import { CURRENT_STATE } from './fixtures/content-type';
import { SCENARIOS } from './scenarios';
import { buildVariants } from './variants';

const bundle = {
  schemas: buildVariants(),
  scenarios: SCENARIOS.map((s) => ({ key: s.key, title: s.title, task: s.task })),
  currentState: CURRENT_STATE,
};

const wrap = process.argv.includes('--wrap');

// eslint-disable-next-line no-console
console.log(JSON.stringify(wrap ? { bundle } : bundle, null, 2));
