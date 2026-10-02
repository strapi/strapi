import fs from 'node:fs';

// Lazy: only resolved when compileStrapi is invoked (develop / build)
let lazyTsUtils: typeof import('@strapi/typescript-utils') | undefined;
const tsUtils = (): typeof import('@strapi/typescript-utils') => {
  if (!lazyTsUtils) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyTsUtils = require('@strapi/typescript-utils');
  }
  return lazyTsUtils as typeof import('@strapi/typescript-utils');
};

interface Options {
  appDir?: string;
  ignoreDiagnostics?: boolean;
  /**
   * Reuse the existing build output instead of compiling the TypeScript project.
   * Defaults to `true` when the `STRAPI_SKIP_COMPILE` environment variable is set to `true`.
   */
  skipCompile?: boolean;
}

export default async function compile({
  appDir = process.cwd(),
  ignoreDiagnostics = false,
  skipCompile = process.env.STRAPI_SKIP_COMPILE === 'true',
}: Options = {}) {
  const isTSProject = await tsUtils().isUsingTypeScript(appDir);

  if (!isTSProject) {
    return { appDir, distDir: appDir };
  }

  const outDir = await tsUtils().resolveOutDir(appDir);

  if (skipCompile) {
    return { appDir, distDir: assertBuildOutput(outDir) };
  }

  await tsUtils()
    .compile(appDir, { configOptions: { options: { incremental: true }, ignoreDiagnostics } })
    // we exit here to maintain the same behavior as before.
    .catch(() => process.exit(1));

  return { appDir, distDir: outDir };
}

/**
 * Ensure the existing build output can be reused when compilation is skipped.
 */
function assertBuildOutput(outDir: string | undefined): string {
  if (!outDir) {
    throw new Error(
      'No "outDir" is configured in tsconfig.json. It is required to use the skip compile option'
    );
  }

  if (!fs.existsSync(outDir)) {
    throw new Error(
      `${outDir} directory not found. Please run the build command before using the skip compile option`
    );
  }

  return outDir;
}
