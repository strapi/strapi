import { type ListFilter } from '../../hooks/useListFilters';
import { buildAssetFilters, parseCalendarDate } from '../buildAssetFilters';

// Fixed "now": 2026-06-15 12:00 local time.
const NOW = new Date(2026, 5, 15, 12, 0, 0);

const iso = (year: number, month: number, day: number, ...time: number[]) =>
  new Date(year, month - 1, day, ...(time as [number, number, number, number])).toISOString();

describe('buildAssetFilters', () => {
  it('returns no clauses and full visibility without filters', () => {
    expect(buildAssetFilters([], NOW)).toEqual({
      fileClauses: [],
      folderClauses: [],
      showFolders: true,
      showFiles: true,
    });
  });

  describe('date filters', () => {
    it('builds withinLast as $gte of now - delta and applies it to folders too', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1week',
        },
      ];

      const { fileClauses, folderClauses } = buildAssetFilters(filters, NOW);
      const expected = { createdAt: { $gte: iso(2026, 6, 8, 12, 0, 0) } };

      expect(fileClauses).toEqual([expected]);
      expect(folderClauses).toEqual([expected]);
    });

    it('builds notWithinLast as $lt', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'updatedAt',
          mode: 'preset',
          condition: 'notWithinLast',
          preset: '3months',
        },
      ];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        { updatedAt: { $lt: iso(2026, 3, 15, 12, 0, 0) } },
      ]);
    });

    it('builds isExactly as the calendar day of now - delta', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'isExactly',
          preset: '1day',
        },
      ];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        {
          createdAt: {
            $gte: iso(2026, 6, 14, 0, 0, 0),
            $lte: new Date(2026, 5, 14, 23, 59, 59, 999).toISOString(),
          },
        },
      ]);
    });

    it('clamps month arithmetic at month ends instead of overflowing', () => {
      // Mar 31 − 1 month: naive setters give Feb 31 → Mar 3. Expected: Feb 28.
      const endOfMarch = new Date(2026, 2, 31, 12, 0, 0);
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1month',
        },
      ];

      expect(buildAssetFilters(filters, endOfMarch).fileClauses).toEqual([
        { createdAt: { $gte: iso(2026, 2, 28, 12, 0, 0) } },
      ]);
    });

    it('clamps leap-day year arithmetic', () => {
      // Feb 29 2024 − 1 year → Feb 28 2023 (not Mar 1).
      const leapDay = new Date(2024, 1, 29, 12, 0, 0);
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1year',
        },
      ];

      expect(buildAssetFilters(filters, leapDay).fileClauses).toEqual([
        { createdAt: { $gte: iso(2023, 2, 28, 12, 0, 0) } },
      ]);
    });

    it('clamps multi-month presets landing on short months', () => {
      // May 31 − 3 months → Feb 28 (not Mar 3).
      const endOfMay = new Date(2026, 4, 31, 12, 0, 0);
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '3months',
        },
      ];

      expect(buildAssetFilters(filters, endOfMay).fileClauses).toEqual([
        { createdAt: { $gte: iso(2026, 2, 28, 12, 0, 0) } },
      ]);
    });

    it('handles month presets via calendar arithmetic', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1year',
        },
      ];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        { createdAt: { $gte: iso(2025, 6, 15, 12, 0, 0) } },
      ]);
    });

    it('builds an inclusive is-range from start-of-from to end-of-to', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'range',
          condition: 'is',
          from: '2024-01-01',
          to: '2024-04-07',
        },
      ];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        {
          createdAt: {
            $gte: iso(2024, 1, 1, 0, 0, 0),
            $lte: new Date(2024, 3, 7, 23, 59, 59, 999).toISOString(),
          },
        },
      ]);
    });

    it('builds an is-not range as before-start OR after-end', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'range',
          condition: 'isNot',
          from: '2024-01-01',
          to: '2024-04-07',
        },
      ];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        {
          $or: [
            { createdAt: { $lt: iso(2024, 1, 1, 0, 0, 0) } },
            { createdAt: { $gt: new Date(2024, 3, 7, 23, 59, 59, 999).toISOString() } },
          ],
        },
      ]);
    });
  });

  describe('type filters', () => {
    it('maps single mime values and keeps folders hidden when folder is not selected', () => {
      const filters: ListFilter[] = [{ kind: 'type', condition: 'is', values: ['picture'] }];

      const built = buildAssetFilters(filters, NOW);

      expect(built.fileClauses).toEqual([{ mime: { $contains: 'image' } }]);
      expect(built.folderClauses).toEqual([]);
      expect(built.showFolders).toBe(false);
      expect(built.showFiles).toBe(true);
    });

    it('combines several is-values with $or', () => {
      const filters: ListFilter[] = [{ kind: 'type', condition: 'is', values: ['audio', 'video'] }];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        { $or: [{ mime: { $contains: 'audio' } }, { mime: { $contains: 'video' } }] },
      ]);
    });

    it('treats document as the catch-all (none of the known families)', () => {
      const filters: ListFilter[] = [{ kind: 'type', condition: 'is', values: ['document'] }];

      expect(buildAssetFilters(filters, NOW).fileClauses).toEqual([
        {
          $and: [
            { mime: { $notContains: 'image' } },
            { mime: { $notContains: 'audio' } },
            { mime: { $notContains: 'video' } },
          ],
        },
      ]);
    });

    it('negates every value for is-not (matches none of them)', () => {
      const filters: ListFilter[] = [
        { kind: 'type', condition: 'isNot', values: ['picture', 'document'] },
      ];

      const built = buildAssetFilters(filters, NOW);

      expect(built.fileClauses).toEqual([
        {
          $and: [
            { mime: { $notContains: 'image' } },
            {
              $or: [
                { mime: { $contains: 'image' } },
                { mime: { $contains: 'audio' } },
                { mime: { $contains: 'video' } },
              ],
            },
          ],
        },
      ]);
      // "is not [picture, document]" does not exclude folders.
      expect(built.showFolders).toBe(true);
    });

    it('shows only folders for an is-[folder] badge', () => {
      const filters: ListFilter[] = [{ kind: 'type', condition: 'is', values: ['folder'] }];

      const built = buildAssetFilters(filters, NOW);

      expect(built.fileClauses).toEqual([]);
      expect(built.showFolders).toBe(true);
      expect(built.showFiles).toBe(false);
    });

    it('hides folders for an is-not-[folder] badge but keeps files unfiltered', () => {
      const filters: ListFilter[] = [{ kind: 'type', condition: 'isNot', values: ['folder'] }];

      const built = buildAssetFilters(filters, NOW);

      expect(built.fileClauses).toEqual([]);
      expect(built.showFolders).toBe(false);
      expect(built.showFiles).toBe(true);
    });

    it('keeps folders visible when folder is among the is-values', () => {
      const filters: ListFilter[] = [
        { kind: 'type', condition: 'is', values: ['folder', 'picture'] },
      ];

      const built = buildAssetFilters(filters, NOW);

      expect(built.showFolders).toBe(true);
      expect(built.fileClauses).toEqual([{ mime: { $contains: 'image' } }]);
    });
  });

  it('combines several badges as independent $and entries', () => {
    const filters: ListFilter[] = [
      { kind: 'type', condition: 'is', values: ['picture'] },
      {
        kind: 'date',
        field: 'createdAt',
        mode: 'preset',
        condition: 'withinLast',
        preset: '1week',
      },
    ];

    const built = buildAssetFilters(filters, NOW);

    expect(built.fileClauses).toHaveLength(2);
    // Date clause still reaches folders even though the type badge hides them.
    expect(built.folderClauses).toHaveLength(1);
    expect(built.showFolders).toBe(false);
  });

  describe('parseCalendarDate', () => {
    it('parses YYYY-MM-DD as a LOCAL calendar date, never UTC midnight', () => {
      // `new Date('2024-01-01')` is UTC midnight — Dec 31 in every timezone
      // west of UTC. The local components must match the input in ALL zones.
      const date = parseCalendarDate('2024-01-01');

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
      expect(date.getHours()).toBe(0);
    });
  });
});
