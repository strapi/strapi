import { join } from 'node:path';
import { Plop, run } from 'plop';
import nodePlop from 'node-plop';

// Starts the Plop CLI programmatically
export const runCLI = () => {
  Plop.launch({ configPath: join(__dirname, 'plopfile.js') }, (env) => {
    const options = { ...env, dest: join(process.cwd(), 'src') };
    run(options, undefined, true);
  });
};

// Runs a generator programmatically without prompts
export const generate = async (
  generatorName: string,
  options: unknown,
  { dir = process.cwd(), plopFile = 'plopfile.js' } = {}
) => {
  const plop = nodePlop(join(__dirname, plopFile), {
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
