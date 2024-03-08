import type { GitConfig } from '../core/git';
import type { Logger } from '../core/logger';
import type { PromptObject } from 'prompts';

interface TemplateFeature<T extends string = string> extends Pick<PromptObject<T>, 'initial'> {
  /**
   * Name of the feature you want to add to your package.
   * This must be identical to the name of the feature on npm.
   */
  name: string;
  /**
   * @default true
   */
  optional?: boolean;
}

interface TemplateOption<T extends string = string>
  extends Omit<PromptObject<T>, 'onState' | 'onRender' | 'stdout' | 'stdin' | 'name'> {
  name: string;
}

interface TemplateFile {
  name: string;
  contents: string;
}

interface Template {
  /**
   * If you're not using a template in a CLI environment,
   * it's not recommended to use prompts. Instead, you should
   * just return all the files your template needs in from the
   * `getFiles` function.
   */
  prompts?: Array<TemplateFeature | TemplateOption>;
  /**
   * A dictionary of the files that will be created in the
   * new package. The key is the file name and the value is
   * the file contents, we prettify the contents before writing
   * using a default config if there's not one in the package.
   */
  getFiles: (
    answers?: Array<{ name: string; answer: string | boolean }>
  ) => Promise<Array<TemplateFile>>;
}

interface TemplateContext {
  cwd: string;
  gitConfig: GitConfig | null;
  logger: Logger;
  packagePath: string;
}

type TemplateResolver = (ctx: TemplateContext) => Promise<Template>;

type TemplateOrTemplateResolver = Template | TemplateResolver;

export type {
  Template,
  TemplateContext,
  TemplateResolver,
  TemplateOrTemplateResolver,
  TemplateFile,
  TemplateFeature,
  TemplateOption,
};
