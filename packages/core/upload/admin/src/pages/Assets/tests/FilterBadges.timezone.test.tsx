/**
 * @jest-environment @strapi/admin-test-utils/environment
 * @jest-environment-options {"strapi": {"tz": "America/Los_Angeles"}}
 */
import { render, screen } from '@tests/utils';

import { FilterBadges } from '../components/FilterBadges';

import type { ListFilter, ListFilters } from '../hooks/useListFilters';

const makeListFilters = (filters: ListFilter[]): ListFilters => ({
  filters,
  serialized: '',
  addFilter: jest.fn(),
  updateFilter: jest.fn(),
  removeFilter: jest.fn(),
  clearFilters: jest.fn(),
});

/**
 * Regression test for the calendar-date display bug — in its own file because
 * the timezone must be set through the environment pragma above: the shared
 * setup pins TZ=UTC, the one zone where the bug cannot manifest (UTC-midnight
 * parse and local-midnight parse are the same instant), and V8 freezes a
 * realm's timezone at creation, so it cannot be switched inside a test.
 *
 * In Los Angeles, react-intl's default coercion of a raw `YYYY-MM-DD` string
 * (`new Date(value)` = UTC midnight = 4pm the PREVIOUS day local) rendered
 * `2024-01-01 → 2024-04-07` as `Dec 31 - Apr 06, 2024`. `parseCalendarDate`
 * parses the strings as local calendar days instead.
 */
describe('FilterBadges range dates west of UTC', () => {
  it('renders the calendar days the user picked, not the previous day', () => {
    // Sanity: the pragma took — this realm is UTC-8/-7, not UTC.
    expect(new Date(2024, 0, 1).getTimezoneOffset()).toBeGreaterThan(0);

    const filter: ListFilter = {
      kind: 'date',
      field: 'createdAt',
      mode: 'range',
      condition: 'is',
      from: '2024-01-01',
      to: '2024-04-07',
    };

    render(<FilterBadges listFilters={makeListFilters([filter])} />);

    const badge = screen.getByTestId('filter-badge');
    expect(badge).toHaveTextContent('Jan 01');
    expect(badge).toHaveTextContent('Apr 07, 2024');
    expect(badge).not.toHaveTextContent('Dec');
    expect(badge).not.toHaveTextContent('Apr 06');
  });
});
