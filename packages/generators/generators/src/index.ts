import { join, dirname } from 'node:path';
import handlebars from 'handlebars';
import fs from 'fs-extra';

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
  // Load the plopfile configuration
  const plopfilePath = join(__dirname, plopFile);
  // We need to use require() here because:
  // 1. The path is dynamic (based on plopFile parameter)
  // 2. The plopfile is a CommonJS module
  // 3. Dynamic imports with variables are restricted by rollup
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const plopModule = require(plopfilePath);

  // Create a mock plop API to collect generator configurations
  const generators: Record<string, any> = {};
  const helpers: Record<string, any> = {};

  const mockPlop = {
    setGenerator(name: string, config: any) {
      generators[name] = config;
    },
    setHelper(name: string, fn: any) {
      helpers[name] = fn;
    },
    getDestBasePath() {
      return join(dir, 'src');
    },
    setWelcomeMessage() {}, // no-op
  };

  // Execute the plopfile to register generators
  if (typeof plopModule.default === 'function') {
    plopModule.default(mockPlop);
  } else {
    plopModule(mockPlop);
  }

  // Find the requested generator
  const generator = generators[generatorName];
  if (!generator) {
    throw new Error(`Generator "${generatorName}" not found`);
  }

  // Register handlebars helpers
  Object.keys(helpers).forEach((name) => {
    handlebars.registerHelper(name, helpers[name]);
  });

  // Get the actions for this generator
  const actions =
    typeof generator.actions === 'function' ? generator.actions(options) : generator.actions || [];

  // Execute each action
  for (const action of actions) {
    if (action.type === 'add') {
      const templatePath = join(__dirname, action.templateFile);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiled = handlebars.compile(templateContent);
      const output = compiled({ ...options, ...action.data });

      const outputPath = handlebars.compile(action.path)(options);
      const fullOutputPath = join(dir, 'src', outputPath);

      await fs.ensureDir(dirname(fullOutputPath));
      await fs.writeFile(fullOutputPath, output);
    } else if (action.type === 'modify') {
      const filePath = handlebars.compile(action.path)(options);
      const fullFilePath = join(dir, 'src', filePath);

      if (await fs.pathExists(fullFilePath)) {
        const content = await fs.readFile(fullFilePath, 'utf8');
        const modified = action.transform ? action.transform(content) : content;
        await fs.writeFile(fullFilePath, modified);
      }
    }
  }

  return { success: true };
};
