import { lazyInit } from '@strapi/utils';

// Lazy: only resolved when compileStrapi is invoked (develop / build)
const tsUtils = lazyInit<typeof import('@strapi/typescript-utils')>(() =>
  require('@strapi/typescript-utils')
);

interface Options {
  appDir?: string;
  ignoreDiagnostics?: boolean;
}

export default async function compile(options?: Options) {
  const { appDir = process.cwd(), ignoreDiagnostics = false } = options ?? {};
  const isTSProject = await tsUtils().isUsingTypeScript(appDir);
  const outDir = await tsUtils().resolveOutDir(appDir);

  if (isTSProject) {
    try {
      await tsUtils().compile(appDir, {
        configOptions: { options: { incremental: true }, ignoreDiagnostics },
      });
    } catch {
      // we exit here to maintain the same behavior as before.
      process.exit(1);
    }
  }

  const distDir = isTSProject ? outDir : appDir;

  return { appDir, distDir };
}
