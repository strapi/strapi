import { createRequire } from 'node:module';
import path from 'node:path';
import camelCase from 'lodash/camelCase';
import { getAdminPluginResolutions, isDiskSource } from '@strapi/core';
import type { AdminPluginResolution, AppDefinition } from '@strapi/core';

import type { PluginMeta } from './plugins';

/**
 * Candidate npm package bases for a programmatic plugin's `strapi-admin`
 * frontend entry. An explicit `resolve` hint wins; otherwise we try the
 * first-party `@strapi/<name>` convention and then the bare `<name>`.
 */
const candidateBases = ({ name, resolve }: AdminPluginResolution): string[] => {
  if (resolve) {
    return [resolve];
  }

  return [`@strapi/${name}`, name];
};

/**
 * Resolve a programmatic plugin's admin entry from the app's working directory.
 * Returns the package base whose `strapi-admin` export is resolvable, or
 * `undefined` when the plugin ships no frontend (or isn't installed).
 */
const resolveAdminBase = (
  resolution: AdminPluginResolution,
  requireFromApp: ReturnType<typeof createRequire>
): string | undefined => {
  for (const base of candidateBases(resolution)) {
    try {
      requireFromApp.resolve(`${base}/strapi-admin`);
      return base;
    } catch {
      // Not resolvable from this base — try the next candidate.
    }
  }

  return undefined;
};

/**
 * Derive the frontend plugin set for the admin build from a programmatic
 * {@link AppDefinition} instead of scanning `package.json` (ADR-0006, Phase 2).
 *
 * Each enabled plugin in the `app.plugins` map is mapped to the npm package
 * that exposes its `strapi-admin` entry (via the `resolve` hint or the
 * `@strapi/<name>` / `<name>` conventions). Plugins with no resolvable
 * `strapi-admin` export (e.g. server-only plugins like `email`) are skipped —
 * the same outcome `getMapOfPluginsWithAdmin` produces for file-based apps.
 *
 * When `plugins` is a `fromDisk()` source (the legacy-discovery bridge), this
 * returns `null` so the caller falls back to `getEnabledPlugins`.
 */
export const getProgrammaticPlugins = ({
  app,
  cwd,
}: {
  app: AppDefinition;
  cwd: string;
}): Record<string, PluginMeta> | null => {
  const pluginsSource = app.plugins;

  if (!pluginsSource || isDiskSource(pluginsSource)) {
    return null;
  }

  const requireFromApp = createRequire(path.join(cwd, 'noop.js'));
  const resolutions = getAdminPluginResolutions(pluginsSource);

  const plugins: Record<string, PluginMeta> = {};

  for (const resolution of resolutions) {
    const base = resolveAdminBase(resolution, requireFromApp);

    if (!base) {
      continue;
    }

    plugins[resolution.name] = {
      name: resolution.name,
      importName: camelCase(resolution.name),
      type: 'module',
      modulePath: base,
    };
  }

  return plugins;
};
