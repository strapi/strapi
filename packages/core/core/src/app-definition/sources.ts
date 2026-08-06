import { DISK_SOURCE } from './brand';

/**
 * A branded marker indicating that a resource (or, at the top level, the whole
 * project) should be loaded from disk using the existing file loaders.
 */
export interface DiskSource {
  readonly [DISK_SOURCE]: true;
  readonly path: string;
}

/**
 * Mark a resource (or, at the top level via `from`, the whole project) as
 * loaded from disk. The path is resolved later by the programmatic loader to
 * the matching `loadXFromDir` core.
 *
 * @example
 * ```ts
 * defineApp({ controllers: fromDisk('./src/controllers') });
 * ```
 */
export const fromDisk = (path: string): DiskSource => {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new TypeError('fromDisk(path) requires a non-empty string path');
  }

  return { [DISK_SOURCE]: true, path };
};

/**
 * A resource field is either an in-code value or a disk source.
 */
export type Source<T> = T | DiskSource;
