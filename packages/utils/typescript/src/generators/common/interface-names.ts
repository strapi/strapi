import { models } from '.';
import type { Logger } from '../utils';

/**
 * Warn when several schemas get the same interface name, e.g. `api::foo-bar.baz` and
 * `api::foo.bar-baz`. The emitted declarations then merge into one interface. The names stay as
 * they are: making them unique renames generated interfaces that application code imports.
 */
export const warnOnDuplicateInterfaceNames = (uids: string[], logger: Logger) => {
  const uidsByName = new Map<string, string[]>();

  for (const uid of uids) {
    const name = models.utils.getSchemaInterfaceName(uid);
    uidsByName.set(name, [...(uidsByName.get(name) ?? []), uid]);
  }

  for (const [name, sharing] of uidsByName) {
    if (sharing.length > 1) {
      logger.warn(
        `${sharing.join(', ')} share the generated interface name ${name}, so their types merge. Rename one of them.`
      );
    }
  }
};
