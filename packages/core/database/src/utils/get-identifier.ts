import * as crypto from 'node:crypto';
import { castArray } from 'lodash/fp';

export type Suffix = keyof typeof SUFFIX_MAP;

const IDENTIFIER_MAX_LENGTH = 53;

const SUFFIX_MAP = {
  fk: 'fk',
  unique: 'unq',
  primary: 'pk',
  index: 'idx',
  component_: 'cmp',
  components: 'cmps',
  component_type_index: 'cmpix',
  entity_fk: 'etfk',
  field_index: 'flix',
  order: 'ord',
  order_fk: 'ofk',
  order_inv_fk: 'oifk',
  order_index: 'oidx',
  inv_fk: 'ifk',
  morphs: 'mph',
  links: 'lnk',
  id_column_index: 'idix',
} as const;

function getHash(str: string) {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return hash.slice(0, 6);
}

export function getIdentifier(parts: string | string[], suffix?: Suffix): string {
  const identifier = castArray(parts).join('_');
  const shortSuffix = suffix ? SUFFIX_MAP[suffix] : undefined;
  const fullIdentifier = shortSuffix ? `${identifier}_${shortSuffix}` : identifier;

  if (fullIdentifier.length <= IDENTIFIER_MAX_LENGTH) {
    return fullIdentifier;
  }

  const hash = getHash(fullIdentifier);
  const hashSuffix = shortSuffix ? `_${hash}_${shortSuffix}` : `_${hash}`;

  return identifier.substring(0, IDENTIFIER_MAX_LENGTH - hashSuffix.length) + hashSuffix;
}

/**
 * v4 method of generating identifiers to help build migration code
 * @internal
 */
export function getv4Identifier(parts: string | string[], suffix?: Suffix): string {
  const identifier = castArray(parts).join('_');
  return suffix ? `${identifier}_${suffix}` : identifier;
}

export function getIdentifiers(parts: string | string[], suffix?: Suffix): [string, string] {
  return [getIdentifier(parts, suffix), getv4Identifier(parts, suffix)];
}
