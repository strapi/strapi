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
      Plop.execute(env, [], (env, argv) => {
        const options = {
          ...env,
          dest: join(process.cwd(), 'src'), // this will make the destination path to be based on the cwd when calling the wrapper
        };
        return run(options, argv, true); // Pass the third argument 'true' for passArgsBeforeDashes
      });
    }
  );
};

type GenerateOptions = {
  dir?: string;
  plopFile?: string;
};

type GeneratorAction = {
  type: 'add' | 'modify';
  path: string;
  templateFile?: string;
  data?: Record<string, any>;
  transform?: (content: string) => string;
};

export const generate = async <T extends Record<string, any>>(
  generatorName: string,
  options: T,
  { dir = process.cwd(), plopFile = 'plopfile.js' }: GenerateOptions = {}
) => {
  // Resolve the absolute path to the plopfile (generator definitions)
  const plopfilePath = join(__dirname, plopFile);
  // Dynamically require the plopfile module.
  // Note: This allows loading either CommonJS or transpiled ESM plopfiles.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const plopModule = require(plopfilePath);

  // Internal objects to store registered generators and helpers.
  // These will be populated by the plopfile when it is executed.
  const generators: Record<string, any> = {};
  const helpers: Record<string, any> = {};

  // Minimal mock Plop API implementation, exposing only the methods needed by our plopfile.
  // This allows the plopfile to register generators and helpers as it would in a real Plop environment.
  const plopApi = {
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

  // Execute the plopfile, passing in our API.
  // This will populate the `generators` and `helpers` objects.
  // Support both CommonJS and ESM default exports.
  if (typeof plopModule.default === 'function') {
    plopModule.default(plopApi);
  } else {
    plopModule(plopApi);
  }

  const generator = generators[generatorName];
  if (!generator) {
    throw new Error(`Generator "${generatorName}" not found`);
  }

  registerHandlebarsHelpers(helpers);
  const actions: GeneratorAction[] =
    typeof generator.actions === 'function' ? generator.actions(options) : generator.actions || [];

  await executeActions(actions, options, dir);

  return { success: true };
};

const registerHandlebarsHelpers = (helpers: Record<string, any>) => {
  Object.entries(helpers).forEach(([name, fn]) => handlebars.registerHelper(name, fn));
};

// Executes generator actions: add or modify files as specified
const executeActions = async (
  actions: GeneratorAction[],
  options: Record<string, any>,
  dir: string
) => {
  for (const action of actions) {
    const outputPath = handlebars.compile(action.path)(options);
    const fullPath = join(dir, 'src', outputPath);

    if (action.type === 'add' && action.templateFile) {
      const templatePath = join(__dirname, action.templateFile);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiled = handlebars.compile(templateContent);
      const output = compiled({ ...options, ...action.data });

      await fs.ensureDir(dirname(fullPath));
      await fs.writeFile(fullPath, output);
    }

    if (action.type === 'modify') {
      if (await fs.pathExists(fullPath)) {
        const content = await fs.readFile(fullPath, 'utf8');
        const modified = action.transform ? action.transform(content) : content;
        await fs.writeFile(fullPath, modified);
      }
    }
  }
};
