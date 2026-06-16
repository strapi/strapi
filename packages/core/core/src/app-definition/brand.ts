import type { AppDefinition } from './types';
import type { DiskSource } from './sources';

/**
 * Symbol brands used to detect programmatic-mode values at runtime.
 *
 * `Symbol.for` is used so the brand is stable across multiple copies/instances
 * of the module (e.g. when a plugin and the host bundle `@strapi/core`
 * separately). Equality of `Symbol.for('x')` is guaranteed by the global
 * symbol registry.
 */
export const APP_DEFINITION = Symbol.for('strapi.appDefinition');
export const DISK_SOURCE = Symbol.for('strapi.diskSource');

const isObject = (v: unknown): v is Record<PropertyKey, unknown> =>
  typeof v === 'object' && v !== null;

/**
 * Detects a value produced by `defineApp()`.
 */
export const isAppDefinition = (v: unknown): v is AppDefinition =>
  isObject(v) && (v as Record<symbol, unknown>)[APP_DEFINITION] === true;

/**
 * Detects a value produced by `fromDisk()`.
 */
export const isDiskSource = (v: unknown): v is DiskSource =>
  isObject(v) && (v as Record<symbol, unknown>)[DISK_SOURCE] === true;
