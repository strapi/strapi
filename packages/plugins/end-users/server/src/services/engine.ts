import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { createEngine } from '../engine/better-auth/create-engine';
import { emptyStartupInputs, fingerprint, readStartupInputs } from '../engine/startup-inputs';
import type { AuthEngine } from '../engine/types';
import { PERMISSIONS_TTL_MS } from './ability';

/**
 * `strapi.plugin('end-users').service('engine')`: the one authentication engine of the
 * application, built on first use (Better Auth reads the plugin config and the project's
 * `auth` option then, not when the plugin is loaded).
 *
 * Better Auth reads a few admin settings only when it is built (`readStartupInputs`).
 * `ensureCurrent()` rebuilds the engine when they differ from the ones it was built from;
 * `reload()` rebuilds it now.
 *
 * A rebuild that fails leaves the engine in place answering (the caller decides what to do with
 * the error). The inputs that failed are remembered, so the same ones are retried at most once
 * every `PERMISSIONS_TTL_MS` and not on every request; different inputs are tried at once.
 */
const engineService = ({ strapi }: { strapi: Core.Strapi }) => {
  let engine: AuthEngine | undefined;
  // The inputs the first engine is built from, which the fingerprint of what it was built from is
  // taken from, so that the two cannot differ (a mismatch rebuilds the engine on the first request)
  const first = emptyStartupInputs();
  let builtFrom = fingerprint(first);
  // The rebuild in progress, which every caller that arrives meanwhile waits for
  let pending: Promise<void> | undefined;
  // The inputs of the last rebuild that failed, and when
  let failed: { fingerprint: string; at: number } | undefined;

  const get = (): AuthEngine => {
    engine ??= createEngine(strapi, undefined, first);

    return engine;
  };

  const track = (rebuild: Promise<void>) => {
    pending = rebuild;

    const clear = () => {
      if (pending === rebuild) {
        pending = undefined;
      }
    };

    rebuild.then(clear, clear);

    return rebuild;
  };

  const rebuildFrom = async (inputs: Awaited<ReturnType<typeof readStartupInputs>>) => {
    await get().reload(inputs);
    builtFrom = fingerprint(inputs);
    failed = undefined;
  };

  return {
    get,

    /** Rebuilds the engine when a start-up setting changed since it was built. */
    ensureCurrent(): Promise<void> {
      if (pending) {
        return pending;
      }

      return track(
        (async () => {
          const inputs = await readStartupInputs(strapi);

          const current = fingerprint(inputs);

          if (current === builtFrom) {
            return;
          }

          if (failed?.fingerprint === current && Date.now() - failed.at < PERMISSIONS_TTL_MS) {
            return;
          }

          try {
            await rebuildFrom(inputs);
          } catch (error) {
            failed = { fingerprint: current, at: Date.now() };
            strapi.log.error(
              `${PLUGIN_ID}: could not rebuild the engine from a changed setting, so the ` +
                `previous one keeps answering: ${error instanceof Error ? error.message : error}`
            );

            throw error;
          }
        })()
      );
    },

    /** Rebuilds the engine now, from the settings as they are. */
    reload(): Promise<void> {
      const previous = pending;

      return track(
        (async () => {
          // After a rebuild in progress, which may have read the settings before this change
          await previous?.catch(() => undefined);
          await rebuildFrom(await readStartupInputs(strapi));
        })()
      );
    },
  };
};

export default engineService;
