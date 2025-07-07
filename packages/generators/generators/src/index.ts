import { join } from 'node:path';

// Starts the Plop CLI programmatically
export const runCLI = async () => {
  const { Plop, run } = await import('plop');

  Plop.prepare(
    {
      configPath: join(__dirname, 'plopfile.js'),
    },
    (env) => {
      const argv = process.argv.slice(2); // Extract command-line arguments
      Plop.execute(env, argv, (env, argv) => {
        const options = {
          ...env,
          dest: join(process.cwd(), 'src'), // this will make the destination path to be based on the cwd when calling the wrapper
        };
        return run(options, argv, true); // Pass the third argument 'true' for passArgsBeforeDashes
      });
    }
  );
};

// Runs a generator programmatically without prompts
export const generate = async <T extends Record<string, any>>(
  generatorName: string,
  options: T,
  { dir = process.cwd(), plopFile = 'plopfile.js' } = {}
) => {
  const { Plop, run } = await import('plop');
  
  return new Promise<void>((resolve, reject) => {
    Plop.prepare(
      {
        cwd: dir,
        configPath: join(__dirname, plopFile),
      },
      (env) => {
        try {
          const argv = [generatorName];
          // Add options as command line arguments
          for (const [key, value] of Object.entries(options)) {
            argv.push(`--${key}`, String(value));
          }
          
          Plop.execute(env, argv, (env, argv) => {
            const runOptions = {
              ...env,
              dest: join(dir, 'src'),
            };
            
            return run(runOptions, argv, true)
              .then(() => resolve())
              .catch(reject);
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};
