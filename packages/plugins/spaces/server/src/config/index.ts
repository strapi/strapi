interface SpacesPluginConfig {
  /** Maximum number of workspaces (archived included); `null` = unlimited. The licence wins when it sets one. */
  maxSpaces: number | null;
  /** Attach rows that predate workspaces to the default workspace on boot (once). */
  backfill: boolean;
}

export default {
  default: (): SpacesPluginConfig => ({ maxSpaces: null, backfill: true }),
  validator(config: Partial<SpacesPluginConfig>) {
    if (
      config.maxSpaces !== undefined &&
      config.maxSpaces !== null &&
      (!Number.isInteger(config.maxSpaces) || config.maxSpaces < 1)
    ) {
      throw new Error('[spaces] `maxSpaces` must be a positive integer or null');
    }
    if (config.backfill !== undefined && typeof config.backfill !== 'boolean') {
      throw new Error('[spaces] `backfill` must be a boolean');
    }
  },
};

export type { SpacesPluginConfig };
