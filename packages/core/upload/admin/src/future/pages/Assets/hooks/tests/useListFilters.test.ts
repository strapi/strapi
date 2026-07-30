import { renderHook, act } from '@tests/utils';
import { useLocation, useNavigationType } from 'react-router-dom';

import {
  parseFiltersParam,
  serializeFilters,
  useListFilters,
  type ListFilter,
} from '../useListFilters';

describe('useListFilters codec', () => {
  describe('parseFiltersParam', () => {
    it('returns an empty list for empty input', () => {
      expect(parseFiltersParam(undefined)).toEqual([]);
      expect(parseFiltersParam('')).toEqual([]);
    });

    it('returns an empty list for non-string input (qs can produce arrays/objects)', () => {
      // `?filters[]=a&filters[]=b` parses to an array; hand-edited URLs are user input.
      expect(parseFiltersParam(['type:is:picture', 'created:within:1week'])).toEqual([]);
      expect(parseFiltersParam({ 0: 'type:is:picture' })).toEqual([]);
      expect(parseFiltersParam(42)).toEqual([]);
    });

    it('parses a type badge with several values', () => {
      expect(parseFiltersParam('type:is:picture,audio')).toEqual([
        { kind: 'type', condition: 'is', values: ['picture', 'audio'] },
      ]);
      expect(parseFiltersParam('type:not:folder')).toEqual([
        { kind: 'type', condition: 'isNot', values: ['folder'] },
      ]);
    });

    it('parses date preset badges for both fields', () => {
      expect(parseFiltersParam('created:within:1week;updated:notwithin:3months')).toEqual([
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1week',
        },
        {
          kind: 'date',
          field: 'updatedAt',
          mode: 'preset',
          condition: 'notWithinLast',
          preset: '3months',
        },
      ]);
    });

    it('parses a range badge', () => {
      expect(parseFiltersParam('created:rangeis:2024-01-01..2024-04-07')).toEqual([
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'range',
          condition: 'is',
          from: '2024-01-01',
          to: '2024-04-07',
        },
      ]);
    });

    it('drops malformed badges but keeps valid ones', () => {
      expect(
        parseFiltersParam('garbage;type:is:zebra;created:within:2decades;type:is:video')
      ).toEqual([{ kind: 'type', condition: 'is', values: ['video'] }]);
    });

    it('drops unknown type values inside an otherwise valid badge', () => {
      expect(parseFiltersParam('type:is:picture,zebra')).toEqual([
        { kind: 'type', condition: 'is', values: ['picture'] },
      ]);
    });

    it('rejects ranges with malformed dates', () => {
      expect(parseFiltersParam('created:rangeis:2024-01-01..sometime')).toEqual([]);
    });
  });

  describe('serializeFilters', () => {
    it('round-trips every badge shape', () => {
      const filters: ListFilter[] = [
        { kind: 'type', condition: 'isNot', values: ['picture', 'document'] },
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'isExactly',
          preset: '1day',
        },
        {
          kind: 'date',
          field: 'updatedAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1year',
        },
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'range',
          condition: 'isNot',
          from: '2024-01-01',
          to: '2024-04-07',
        },
      ];

      expect(parseFiltersParam(serializeFilters(filters))).toEqual(filters);
    });

    it('allows duplicate badges for the same field', () => {
      const filters: ListFilter[] = [
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'withinLast',
          preset: '1month',
        },
        {
          kind: 'date',
          field: 'createdAt',
          mode: 'preset',
          condition: 'notWithinLast',
          preset: '1week',
        },
      ];

      expect(parseFiltersParam(serializeFilters(filters))).toEqual(filters);
    });
  });
});

describe('useListFilters URL writes', () => {
  it('updates the URL with history replace so filter micro-edits do not pile Back entries', () => {
    const { result } = renderHook(
      () => ({
        listFilters: useListFilters(),
        navigationType: useNavigationType(),
        location: useLocation(),
      }),
      { initialEntries: ['/'] }
    );

    act(() => {
      result.current.listFilters.addFilter({ kind: 'type', condition: 'is', values: ['picture'] });
    });

    expect(result.current.location.search).toContain('filters=');
    expect(result.current.navigationType).toBe('REPLACE');

    act(() => {
      result.current.listFilters.clearFilters();
    });

    expect(result.current.location.search).not.toContain('filters=');
    expect(result.current.navigationType).toBe('REPLACE');
  });
});
