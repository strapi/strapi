#!/usr/bin/env tsx
/**
 * Boot Strapi from an app directory (pinned npm install), run migrations, exit.
 * Resolves @strapi/strapi from appRoot/node_modules (not the caller's tree).
 */
const path = require('path');
const Module = require('module');

const appRoot = path.resolve(process.argv[2] || process.cwd());
const pkgPath = path.join(appRoot, 'package.json');
const req = Module.createRequire(pkgPath);

async function main(): Promise<void> {
  process.chdir(appRoot);
  const { createStrapi, compileStrapi } = req('@strapi/strapi');
  // Pinned npm releases can disagree with fixture TS on type-only edges; still emit JS.
  const appContext = await compileStrapi({ ignoreDiagnostics: true });
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';
  await strapi.destroy();
  console.log(`\n✅ Pinned Strapi boot completed (${appRoot})`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
