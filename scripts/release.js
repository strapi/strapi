const { releaseChangelog, releasePublish, releaseVersion } = require('nx/release');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs');

(async () => {
  const options = await yargs
    .version(false)
    .option('version', {
      description:
        'Explicit version specifier to use, overriding conventional commits if provided.',
      type: 'string',
    })
    .option('preid', {
      description:
        'Specify the prerelease identifier (e.g., beta, alpha, rc) to append to the version when creating a prerelease.',
      type: 'string',
    })
    .option('dryRun', {
      alias: 'd',
      description: 'Run the release process in dry-run mode, defaults to true.',
      type: 'boolean',
      default: true,
    })
    .option('verbose', {
      description: 'Enable verbose logging for debugging, defaults to false.',
      type: 'boolean',
      default: false,
    })
    .option('publish', {
      description: 'Control whether the packages should be published, defaults to true.',
      type: 'boolean',
      default: true,
    })
    .option('changelog', {
      description:
        'Control whether a GitHub release and changelog should be generated, defaults to true.',
      type: 'boolean',
      default: true,
    })
    .options('onlyPublish', {
      description: 'Publish packages without performing other release steps.',
      type: 'boolean',
      default: false,
    })
    .option('tag', {
      description: 'Specify a custom tag for the release.',
      type: 'string',
    })
    .option('opt', {
      description: 'npm one time password',
      type: 'string',
    })
    .option('gitCommit', {
      description: 'Control whether to commit or not. (default to true)',
      type: 'boolean',
      default: true,
    })
    .option('gitTag', {
      description: 'Control whether to add git tag or not. (default to true)',
      type: 'boolean',
      default: true,
    })
    .parseAsync();

  let workspaceVersion, projectsVersionData;

  if (!options.onlyPublish) {
    const versionResult = await releaseVersion({
      specifier: options.version,
      dryRun: options.dryRun,
      verbose: options.verbose,
      gitCommit: options.gitCommit,
      preid: options.preid,
      gitCommitArgs: '--no-verify',
    });
    workspaceVersion = versionResult.workspaceVersion;
    projectsVersionData = versionResult.projectsVersionData;

    /**
     * Nx's releaseVersion updates `dependencies`, `devDependencies`, and `optionalDependencies`
     * but intentionally skips `peerDependencies` (see: https://github.com/nrwl/nx/issues/22776).
     *
     * For experimental/nightly releases (e.g. 0.0.0-experimental.<sha>), peer dep ranges like
     * `^5.0.0` cannot satisfy `0.0.0-experimental.*` — semver prerelease matching is tuple-locked,
     * so no range notation can express "any 5.x stable OR any 0.0.0-experimental.*".
     *
     * We fix this by rewriting internal @strapi/* peerDependencies to the exact experimental
     * version after Nx versioning completes, but before the build step.
     */
    if (options.version !== undefined && /^0\.0\.0-.+/.test(options.version)) {
      rewriteInternalPeerDependencies(options.version, options.dryRun);
    }
  }

  // Run clean and build
  execSync('./node_modules/.bin/nx run-many --target=clean --nx-ignore-cycles', {
    stdio: 'inherit',
  });
  execSync('./node_modules/.bin/nx run-many --target=build --nx-ignore-cycles --skip-nx-cache', {
    stdio: 'inherit',
  });

  let publishResults;
  if (options.publish) {
    publishResults = await releasePublish({
      dryRun: options.dryRun,
      verbose: options.verbose,
      tag: options.tag,
      otp: options.otp,
    });
  }

  if (options.changelog && !options.onlyPublish) {
    await releaseChangelog({
      versionData: projectsVersionData,
      version: workspaceVersion,
      dryRun: options.dryRun,
      verbose: options.verbose,
      gitCommit: false,
      gitTag: options.gitTag,
    });
  }

  // Exit with code 0 if all publish results are successful, else 1
  if (publishResults) {
    const exitCode = Object.values(publishResults).every((result) => result.code === 0) ? 0 : 1;
    process.exit(exitCode);
  } else {
    process.exit();
  }
})();

/**
 * Rewrites internal @strapi/* peerDependencies across all workspace packages to an exact version.
 *
 * Why: Nx release does not update peerDependencies (by design). For prerelease versions like
 * `0.0.0-experimental.<sha>`, ranges such as `^5.0.0` can never match due to semver's
 * tuple-locked prerelease matching rules. This causes npm ERESOLVE failures at install time.
 *
 * When: Only called for versions matching `0.0.0-*` (experimental, nightly).
 * Where: After releaseVersion() bumps all `version` fields, before the build/publish steps.
 */
function rewriteInternalPeerDependencies(version, dryRun) {
  const rootDir = path.resolve(__dirname, '..');
  const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const workspacePatterns = rootPkg.workspaces || [];

  // Only process packages/ — examples/, .github/, scripts/ are not published to npm
  const publishablePatterns = workspacePatterns.filter((p) => p.startsWith('packages/'));

  // Collect all publishable package.json paths
  const packageJsonPaths = [];
  for (const pattern of publishablePatterns) {
    // pattern is a simple glob like "packages/*" or "packages/*/*"
    // Resolve it by listing matching directories
    const parts = pattern.split('/');
    const resolved = resolveGlobDirs(rootDir, parts);
    for (const dir of resolved) {
      const candidate = path.join(dir, 'package.json');
      if (fs.existsSync(candidate)) {
        packageJsonPaths.push(candidate);
      }
    }
  }

  // First pass: collect all @strapi/* package names in the workspace
  const workspacePackageNames = new Set();
  for (const pkgPath of packageJsonPaths) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== undefined && pkg.name.startsWith('@strapi/')) {
      workspacePackageNames.add(pkg.name);
    }
  }

  // Second pass: rewrite peerDependencies
  let updatedCount = 0;
  for (const pkgPath of packageJsonPaths) {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);

    if (pkg.peerDependencies === undefined) {
      continue;
    }

    let changed = false;
    for (const dep of Object.keys(pkg.peerDependencies)) {
      if (workspacePackageNames.has(dep)) {
        pkg.peerDependencies[dep] = version;
        changed = true;
      }
    }

    if (changed === true) {
      if (dryRun === true) {
        console.log(
          `[dry-run] Would rewrite peerDependencies in ${path.relative(rootDir, pkgPath)}`
        );
      } else {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Rewrote peerDependencies in ${path.relative(rootDir, pkgPath)}`);
      }
      updatedCount++;
    }
  }

  console.log(
    `${dryRun === true ? '[dry-run] ' : ''}Rewrote @strapi/* peerDependencies to "${version}" in ${updatedCount} packages`
  );
}

/**
 * Resolves a simple workspace glob pattern (e.g. ["packages", "*", "*"]) into actual directories.
 */
function resolveGlobDirs(base, parts) {
  if (parts.length === 0) {
    return [base];
  }

  const [current, ...rest] = parts;

  if (current === '*') {
    if (fs.existsSync(base) === false) {
      return [];
    }
    const entries = fs.readdirSync(base, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(base, e.name));
    return dirs.flatMap((dir) => resolveGlobDirs(dir, rest));
  }

  return resolveGlobDirs(path.join(base, current), rest);
}
