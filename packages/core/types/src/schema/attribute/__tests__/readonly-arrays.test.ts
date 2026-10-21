import type * as UID from '../../../uid';
import type { AnyAttribute } from '../common';
import type { DynamicZoneTargets, EnumerationValue } from '../definitions';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

const STATUSES = ['ACTIVE', 'INACTIVE'] as const;
const COMPONENTS = ['default.foo', 'default.bar'] as const satisfies readonly UID.Component[];
const ALLOWED_TYPES = ['images', 'files'] as const;
const REPLACEMENTS: ReadonlyArray<[string, string]> = [['&', 'and']];
const COLUMN_ARGS = [10, 2] as const;

export const attributes = {
  enumeration: { type: 'enumeration', enum: STATUSES, default: 'ACTIVE' },
  dynamicZone: { type: 'dynamiczone', components: COMPONENTS },
  media: { type: 'media', allowedTypes: ALLOWED_TYPES },
  uid: { type: 'uid', options: { customReplacements: REPLACEMENTS } },
  column: { type: 'decimal', column: { args: COLUMN_ARGS } },
} satisfies Record<string, AnyAttribute>;

true satisfies Assert<IsEqual<EnumerationValue<typeof STATUSES>, 'ACTIVE' | 'INACTIVE'>>;
true satisfies Assert<
  IsEqual<
    DynamicZoneTargets<{ type: 'dynamiczone'; components: typeof COMPONENTS }>,
    'default.foo' | 'default.bar'
  >
>;
