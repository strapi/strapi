const { releaseChangelog, releasePublish, releaseVersion } = require('nx/release');
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

  if (!options.onlyPublish) {
    const { workspaceVersion, projectsVersionData } = await releaseVersion({
      specifier: options.version,
      dryRun: options.dryRun,
      verbose: options.verbose,
      gitCommit: options.gitCommit,
      gitTag: options.gitTag,
      preid: options.preid,
    });

    if (options.changelog) {
      await releaseChangelog({
        versionData: projectsVersionData,
        version: workspaceVersion,
        dryRun: options.dryRun,
        verbose: options.verbose,
        gitCommit: false,
        gitTag: false,
      });
    }
  }

  if (options.publish) {
    const publishResults = await releasePublish({
      dryRun: options.dryRun,
      verbose: options.verbose,
      tag: options.tag,
      otp: options.otp,
    });
    process.exit(Object.values(publishResults).every((result) => result.code === 0) ? 0 : 1);
  }

  process.exit();
})();
