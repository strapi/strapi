import { join } from 'node:path';
import { Plop, run } from 'plop';
import nodePlop from 'node-plop';

const PLOPFILE = process.env.NODE_ENV === 'test' ? 'plopfile.ts' : 'plopfile.js';

// Starts the Plop CLI programmatically
export const runCLI = () => {
  Plop.launch({ configPath: join(__dirname, PLOPFILE) }, (env) => {
    const options = { ...env, dest: join(process.cwd(), 'src') };
    run(options, undefined, true);
  });
};

// Runs a generator programmatically without prompts
export const generate = async (
  generatorName: string,
  options: unknown,
  { dir = process.cwd() } = {}
) => {
  const plop = nodePlop(join(__dirname, PLOPFILE), {
    destBasePath: join(dir, 'src'),
    force: false,
  });

  const generator = plop.getGenerator(generatorName);
  await generator.runActions(options, {
    onSuccess() {},
    onFailure() {},
    onComment() {},
  });
};
