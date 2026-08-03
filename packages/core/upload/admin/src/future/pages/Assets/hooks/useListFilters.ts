import { useQueryParams } from '@strapi/admin/strapi-admin';

/**
 * Filter state for the assets list, backed by a single `?filters=` query param
 * so the applied filters are shareable and survive Back/refresh.
 *
 * Serialized grammar — badges separated by `;`, one badge is
 * `<field>:<condition>:<value>`:
 *
 * - `type:is:picture,audio` / `type:not:folder`
 * - `created:within:1week` / `updated:notwithin:3months` / `created:exact:1day`
 * - `created:rangeis:2024-01-01..2024-04-07` / `created:rangenot:...`
 *
 * Relative presets stay relative in the URL on purpose: the badge label
 * ("1 week ago") remains truthful forever and a shared link means "within the
 * last week from whenever it is opened". Resolution to absolute timestamps
 * happens at query-build time (see utils/buildAssetFilters.ts).
 *
 * Several badges for the same field are allowed, even contradictory ones —
 * everything is combined with AND; contradictions simply produce the filtered
 * empty state.
 */

export const TYPE_VALUES = ['folder', 'picture', 'audio', 'video', 'document'] as const;
export type TypeValue = (typeof TYPE_VALUES)[number];

export const DATE_PRESETS = [
  '1day',
  '3days',
  '1week',
  '1month',
  '3months',
  '6months',
  '1year',
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export type TypeCondition = 'is' | 'isNot';
export type PresetCondition = 'isExactly' | 'withinLast' | 'notWithinLast';
export type RangeCondition = 'is' | 'isNot';

export type DateField = 'createdAt' | 'updatedAt';

export interface TypeFilter {
  kind: 'type';
  condition: TypeCondition;
  values: TypeValue[];
}

export interface DatePresetFilter {
  kind: 'date';
  field: DateField;
  mode: 'preset';
  condition: PresetCondition;
  preset: DatePreset;
}

export interface DateRangeFilter {
  kind: 'date';
  field: DateField;
  mode: 'range';
  condition: RangeCondition;
  /** Calendar dates, `YYYY-MM-DD`, inclusive on both ends. */
  from: string;
  to: string;
}

export type DateFilter = DatePresetFilter | DateRangeFilter;
export type ListFilter = TypeFilter | DateFilter;

const FIELD_TOKENS: Record<string, DateField> = {
  created: 'createdAt',
  updated: 'updatedAt',
};
const FIELD_TOKEN_BY_FIELD: Record<DateField, string> = {
  createdAt: 'created',
  updatedAt: 'updated',
};

const PRESET_CONDITION_TOKENS: Record<string, PresetCondition> = {
  exact: 'isExactly',
  within: 'withinLast',
  notwithin: 'notWithinLast',
};
const PRESET_TOKEN_BY_CONDITION: Record<PresetCondition, string> = {
  isExactly: 'exact',
  withinLast: 'within',
  notWithinLast: 'notwithin',
};

const RANGE_CONDITION_TOKENS: Record<string, RangeCondition> = {
  rangeis: 'is',
  rangenot: 'isNot',
};
const RANGE_TOKEN_BY_CONDITION: Record<RangeCondition, string> = {
  is: 'rangeis',
  isNot: 'rangenot',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isTypeValue = (value: string): value is TypeValue =>
  (TYPE_VALUES as readonly string[]).includes(value);

const isDatePreset = (value: string): value is DatePreset =>
  (DATE_PRESETS as readonly string[]).includes(value);

const parseBadge = (raw: string): ListFilter | null => {
  const [field, condition, value] = raw.split(':');

  if (!field || !condition || !value) {
    return null;
  }

  if (field === 'type') {
    if (condition !== 'is' && condition !== 'not') {
      return null;
    }
    const values = value.split(',').filter(isTypeValue);

    return values.length > 0
      ? { kind: 'type', condition: condition === 'is' ? 'is' : 'isNot', values }
      : null;
  }

  const dateField = FIELD_TOKENS[field];
  if (!dateField) {
    return null;
  }

  if (condition in PRESET_CONDITION_TOKENS) {
    return isDatePreset(value)
      ? {
          kind: 'date',
          field: dateField,
          mode: 'preset',
          condition: PRESET_CONDITION_TOKENS[condition],
          preset: value,
        }
      : null;
  }

  if (condition in RANGE_CONDITION_TOKENS) {
    const [from, to] = value.split('..');

    return DATE_RE.test(from ?? '') && DATE_RE.test(to ?? '')
      ? {
          kind: 'date',
          field: dateField,
          mode: 'range',
          condition: RANGE_CONDITION_TOKENS[condition],
          from,
          to,
        }
      : null;
  }

  return null;
};

/**
 * `unknown` on purpose: the query string is user-editable, and qs parses
 * shapes like `?filters[]=a&filters[]=b` into arrays — the guard is what
 * makes the caller's `?filters=` type an assertion rather than a crash.
 */
export const parseFiltersParam = (raw: unknown): ListFilter[] => {
  if (typeof raw !== 'string' || raw === '') {
    return [];
  }

  return raw
    .split(';')
    .map(parseBadge)
    .filter((filter): filter is ListFilter => filter !== null);
};

const serializeBadge = (filter: ListFilter): string => {
  if (filter.kind === 'type') {
    return `type:${filter.condition === 'is' ? 'is' : 'not'}:${filter.values.join(',')}`;
  }

  const field = FIELD_TOKEN_BY_FIELD[filter.field];

  if (filter.mode === 'preset') {
    return `${field}:${PRESET_TOKEN_BY_CONDITION[filter.condition]}:${filter.preset}`;
  }

  return `${field}:${RANGE_TOKEN_BY_CONDITION[filter.condition]}:${filter.from}..${filter.to}`;
};

export const serializeFilters = (filters: ListFilter[]): string =>
  filters.map(serializeBadge).join(';');

export interface ListFilters {
  filters: ListFilter[];
  /** Serialized form — stable fingerprint for list-identity (selection reset). */
  serialized: string;
  addFilter: (filter: ListFilter) => void;
  /** Replaces the badge at `index` (condition or value edited in place). */
  updateFilter: (index: number, filter: ListFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
}

export const useListFilters = (): ListFilters => {
  const [{ query }, setQuery] = useQueryParams<{ filters?: string }>();

  const filters = parseFiltersParam(query?.filters);

  // `replace: true` on every write: filters are edited in rapid micro-steps
  // (each checkbox of the keep-open Type submenu, each badge segment edit), so
  // pushing would turn one logical change into a stack of Back entries. The
  // URL stays shareable and refresh-safe either way.
  const writeFilters = (next: ListFilter[]) => {
    if (next.length === 0) {
      setQuery({ filters: '' }, 'remove', true);
    } else {
      setQuery({ filters: serializeFilters(next) }, 'push', true);
    }
  };

  return {
    filters,
    serialized: serializeFilters(filters),
    addFilter: (filter) => writeFilters([...filters, filter]),
    updateFilter: (index, filter) =>
      writeFilters(filters.map((f, i) => (i === index ? filter : f))),
    removeFilter: (index) => writeFilters(filters.filter((_, i) => i !== index)),
    clearFilters: () => writeFilters([]),
  };
};
