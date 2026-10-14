import { models } from '.';
import type { Logger } from '../utils';

/**
 * The interface name of each schema UID, e.g. `ApiFooBarBaz` for `api::foo-bar.baz`.
 *
 * Several UIDs can get the same name, e.g. `api::foo-bar.baz` and `api::foo.bar-baz`, and their
 * declarations would then merge into one interface. Without strict types, the names stay as they
 * are, with a warning: making them unique renames generated interfaces that application code
 * imports. With strict types, which already change the generated output, every UID after the first
 * one (in code unit order) gets the first free numeric suffix, e.g. `ApiFooBarBaz2`.
 *
 * `uids` must be sorted, so the names do not depend on the order schemas were loaded in.
 */
export const resolveInterfaceNames = (
  uids: string[],
  logger: Logger,
  { strict }: { strict: boolean }
): Map<string, string> => {
  const uidsByName = new Map<string, string[]>();

  for (const uid of uids) {
    const name = models.utils.getSchemaInterfaceName(uid);
    uidsByName.set(name, [...(uidsByName.get(name) ?? []), uid]);
  }

  const names = new Map(uids.map((uid) => [uid, models.utils.getSchemaInterfaceName(uid)]));
  const taken = new Set(names.values());

  for (const [name, sharing] of uidsByName) {
    if (sharing.length === 1) {
      continue;
    }

    if (strict === false) {
      logger.warn(
        `${sharing.join(', ')} share the generated interface name ${name}, so their types merge. Rename one of them.`
      );
      continue;
    }

    for (const uid of sharing.slice(1)) {
      let suffix = 2;
      while (taken.has(`${name}${suffix}`) === true) {
        suffix += 1;
      }

      const unique = `${name}${suffix}`;
      taken.add(unique);
      names.set(uid, unique);
      logger.warn(
        `${uid} shares the generated interface name ${name} with ${sharing[0]}, so its interface is named ${unique}.`
      );
    }
  }

  return names;
};
