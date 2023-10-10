import { getIdentifiers } from './get-identifier';
import type { Suffix } from './get-identifier';

/**
 * Maps short identifiers to their long form to allow auto migrations
 */
const identifierMap = new Map<string, string>();

/**
 * Indentifiers utility
 * NOTE: We keep some reference to v4 for now in order to build data migration logic later
 */
const identifiers = {
  create(parts: string | string[], suffix?: Suffix) {
    const [identifier, v4identifier] = getIdentifiers(parts, suffix);

    identifierMap.set(identifier, v4identifier);

    return identifier;
  },

  toV4(identifier: string) {
    return identifierMap.get(identifier);
  },

  fromV4(identifier: string) {
    return [...identifierMap.entries()].find(
      ([, v4identifier]) => v4identifier === identifier
    )?.[0];
  },

  clear() {
    identifierMap.clear();
  },
};

export default identifiers;
