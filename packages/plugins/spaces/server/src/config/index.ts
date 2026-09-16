export default {
  default: {
    /**
     * Upper bound on how many spaces this project may have, on top of whatever
     * the licence allows. `null` means only the licence decides.
     */
    maxSpaces: null as number | null,
    /**
     * Whether to assign existing content to a first space when Spaces is
     * switched on. Turning this off leaves that content shared with every
     * space, which is almost never what a project wants — it exists so that a
     * migration can be run deliberately instead of at boot.
     */
    migrateOnBootstrap: true,
  },
  validator(config: { maxSpaces?: unknown; migrateOnBootstrap?: unknown }) {
    if (
      config.maxSpaces !== null &&
      config.maxSpaces !== undefined &&
      (!Number.isInteger(config.maxSpaces) || (config.maxSpaces as number) < 1)
    ) {
      throw new Error('spaces: "maxSpaces" must be null or a positive integer.');
    }

    if (config.migrateOnBootstrap !== undefined && typeof config.migrateOnBootstrap !== 'boolean') {
      throw new Error('spaces: "migrateOnBootstrap" must be a boolean.');
    }
  },
};
