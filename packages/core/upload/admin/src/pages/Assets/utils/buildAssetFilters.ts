import {
  type DateFilter,
  type DatePreset,
  type ListFilter,
  type TypeFilter,
  type TypeValue,
} from '../hooks/useListFilters';

/**
 * Translates the URL filter model into Strapi `filters[$and]` entries for the
 * files and folders queries, and decides the structural visibility of both
 * sections.
 *
 * Relative presets resolve against `now` at build time — the URL stays
 * relative ("within the last week"), only the outgoing query is absolute.
 *
 * Semantics:
 * - Every badge is one `$and` entry (badges combine with AND, per ticket).
 * - Type: `folder` is not a mime — it acts structurally on the folders
 *   section. The remaining values map to mime clauses; `document` is the
 *   legacy catch-all (mime contains none of image/audio/video — audio
 *   included in the exclusion, fixing the legacy quirk).
 * - Dates apply to files and folders alike (folders have both timestamps).
 * - "is exactly <preset>" means the calendar day of `now - delta`.
 * - Ranges are inclusive on both ends (start-of-day .. end-of-day).
 */

type QueryClause = Record<string, unknown>;

const MIME_BY_VALUE: Record<Exclude<TypeValue, 'folder' | 'document'>, string> = {
  picture: 'image',
  audio: 'audio',
  video: 'video',
};

const ALL_MIMES = Object.values(MIME_BY_VALUE);

const PRESET_DELTAS: Record<DatePreset, { days?: number; months?: number; years?: number }> = {
  '1day': { days: 1 },
  '3days': { days: 3 },
  '1week': { days: 7 },
  '1month': { months: 1 },
  '3months': { months: 3 },
  '6months': { months: 6 },
  '1year': { years: 1 },
};

const subtractPreset = (now: Date, preset: DatePreset): Date => {
  const { days = 0, months = 0, years = 0 } = PRESET_DELTAS[preset];
  const result = new Date(now.getTime());

  if (years || months) {
    // JS date setters overflow at month ends (Mar 31 − 1 month → Feb 31 → Mar 3),
    // so move to the 1st first and clamp the day to the target month's length.
    const dayOfMonth = result.getDate();
    result.setDate(1);
    result.setFullYear(result.getFullYear() - years);
    result.setMonth(result.getMonth() - months);

    const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  }

  result.setDate(result.getDate() - days);

  return result;
};

const startOfDay = (date: Date): Date => {
  const result = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date.getTime());
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Parses `YYYY-MM-DD` as a local calendar date — NOT `new Date(value)`, which
 * treats date-only strings as UTC midnight and shifts the day in every
 * timezone west of UTC. Shared by the query builder, the badge labels and the
 * range calendar so all three agree on which day a range endpoint means.
 */
export const parseCalendarDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const buildDateClause = (filter: DateFilter, now: Date): QueryClause => {
  const { field } = filter;

  if (filter.mode === 'preset') {
    const pivot = subtractPreset(now, filter.preset);

    switch (filter.condition) {
      case 'withinLast':
        return { [field]: { $gte: pivot.toISOString() } };
      case 'notWithinLast':
        return { [field]: { $lt: pivot.toISOString() } };
      case 'isExactly':
        return {
          [field]: {
            $gte: startOfDay(pivot).toISOString(),
            $lte: endOfDay(pivot).toISOString(),
          },
        };
    }
  }

  const from = startOfDay(parseCalendarDate(filter.from)).toISOString();
  const to = endOfDay(parseCalendarDate(filter.to)).toISOString();

  if (filter.condition === 'is') {
    return { [field]: { $gte: from, $lte: to } };
  }

  return { $or: [{ [field]: { $lt: from } }, { [field]: { $gt: to } }] };
};

const buildMimeClause = (filter: TypeFilter): QueryClause | null => {
  const fileValues = filter.values.filter((value): value is TypeValue => value !== 'folder');

  if (fileValues.length === 0) {
    return null;
  }

  const branches: QueryClause[] = fileValues.map((value) => {
    if (value === 'document') {
      // Catch-all: none of the known mime families.
      return { $and: ALL_MIMES.map((mime) => ({ mime: { $notContains: mime } })) };
    }
    return { mime: { $contains: MIME_BY_VALUE[value as keyof typeof MIME_BY_VALUE] } };
  });

  if (filter.condition === 'is') {
    return branches.length === 1 ? branches[0] : { $or: branches };
  }

  // "is not" = matches none of the selected values: negate each branch, AND them.
  const negated: QueryClause[] = fileValues.map((value) => {
    if (value === 'document') {
      // Not a document = is one of the known families.
      return { $or: ALL_MIMES.map((mime) => ({ mime: { $contains: mime } })) };
    }
    return { mime: { $notContains: MIME_BY_VALUE[value as keyof typeof MIME_BY_VALUE] } };
  });

  return negated.length === 1 ? negated[0] : { $and: negated };
};

export interface BuiltFilters {
  /** Extra `$and` entries for the files query. */
  fileClauses: QueryClause[];
  /** Extra `$and` entries for the folders query (dates only). */
  folderClauses: QueryClause[];
  /**
   * Whether the folders section can show at all. A type badge decides it by
   * evaluating "folder" like any other value: `is` shows folders only when
   * folder is selected; `is not` hides them only when folder is selected.
   */
  showFolders: boolean;
  /**
   * Whether the files list can show at all — false when an `is` type badge
   * selects only "folder" (no file can match).
   */
  showFiles: boolean;
}

export const buildAssetFilters = (filters: ListFilter[], now: Date): BuiltFilters => {
  const fileClauses: QueryClause[] = [];
  const folderClauses: QueryClause[] = [];
  let showFolders = true;
  let showFiles = true;

  for (const filter of filters) {
    if (filter.kind === 'date') {
      const clause = buildDateClause(filter, now);
      fileClauses.push(clause);
      folderClauses.push(clause);
      continue;
    }

    const includesFolder = filter.values.includes('folder');
    if (filter.condition === 'is' ? !includesFolder : includesFolder) {
      showFolders = false;
    }

    const mimeClause = buildMimeClause(filter);
    if (mimeClause) {
      fileClauses.push(mimeClause);
    } else if (filter.condition === 'is') {
      // `is [folder]` only — no file can match the badge.
      showFiles = false;
    }
  }

  return { fileClauses, folderClauses, showFolders, showFiles };
};
