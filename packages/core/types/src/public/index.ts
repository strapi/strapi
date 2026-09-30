/**
 * Dynamic registries that are meant to be augmented/extended by the users
 */
export * from './registries';

export * from './shared';

// By name, not `export *`: an augmentation of an `export *` member replaces it, dropping the built-ins.
export type { LicenseFeatures } from './license-features';
