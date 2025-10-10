/**
 * @description Supports the following managers:
 * – npm
 * – yarn
 * – pnpm
 */
const getPackageManager = () => {
  // Yes, the env var is lowercase - it is set by the package managers themselves
  const agent = process.env.npm_config_user_agent || '';

  if (agent.includes('yarn')) {
    return 'yarn';
  }

  if (agent.includes('pnpm')) {
    return 'pnpm';
  }

  // Both yarn and pnpm does a `npm/?` thing, thus the slightly different match here
  // Theoretically not needed since we check for yarn/pnpm above, but in case other
  // package managers do the same thing, we'll (hopefully) catch them here.
  if (/^npm\/\d/.test(agent)) {
    return 'npm';
  }

  return undefined;
};

export { getPackageManager };
