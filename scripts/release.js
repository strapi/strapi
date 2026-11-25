const { ReleaseClient } = require('nx/release');
const { execSync } = require('child_process');
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

  /**
   * Nx keeps a dependency range untouched when the new version still satisfies it
   * (`preserveMatchingDependencyRanges`, on by default), so stable releases leave internal
   * peerDependencies such as `^5.0.0` alone.
   *
   * Experimental/nightly versions (`0.0.0-experimental.<sha>`) can never satisfy those ranges:
   * semver prerelease matching is tuple-locked. With the option on, Nx refuses to version; with it
   * off, Nx pins every internal dependency, peers included, to the exact prerelease version, which
   * is what an install of an experimental build needs.
   */
  const isZeroPrerelease = options.version !== undefined && /^0\.0\.0-.+/.test(options.version);
  const { releaseChangelog, releasePublish, releaseVersion } = new ReleaseClient(
    isZeroPrerelease ? { version: { preserveMatchingDependencyRanges: false } } : {}
  );

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
