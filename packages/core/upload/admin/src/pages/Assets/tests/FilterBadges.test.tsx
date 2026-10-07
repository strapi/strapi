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

describe('FilterBadges', () => {
  it('renders nothing without filters', () => {
    render(<FilterBadges listFilters={makeListFilters([])} />);

    expect(screen.queryByTestId('filter-badges')).not.toBeInTheDocument();
  });

  it('renders one badge per filter with field, condition and value segments', () => {
    render(
      <FilterBadges
        listFilters={makeListFilters([
          { kind: 'type', condition: 'isNot', values: ['picture'] },
          {
            kind: 'date',
            field: 'updatedAt',
            mode: 'preset',
            condition: 'withinLast',
            preset: '1week',
          },
        ])}
      />
    );

    const badges = screen.getAllByTestId('filter-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('Type');
    expect(badges[0]).toHaveTextContent('is not');
    expect(badges[0]).toHaveTextContent('Picture');
    expect(badges[1]).toHaveTextContent('Last modified');
    expect(badges[1]).toHaveTextContent('within the last');
    expect(badges[1]).toHaveTextContent('1 week ago');
  });

  it('lists several type values separated by commas', () => {
    render(
      <FilterBadges
        listFilters={makeListFilters([
          { kind: 'type', condition: 'is', values: ['picture', 'audio'] },
        ])}
      />
    );

    expect(screen.getByTestId('filter-badge')).toHaveTextContent('Picture, Audio');
  });

  it('edits the condition through the segment popover', async () => {
    const listFilters = makeListFilters([{ kind: 'type', condition: 'is', values: ['picture'] }]);
    const { user } = render(<FilterBadges listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: 'is' }));
    await user.click(await screen.findByRole('button', { name: 'is not' }));

    expect(listFilters.updateFilter).toHaveBeenCalledWith(0, {
      kind: 'type',
      condition: 'isNot',
      values: ['picture'],
    });
  });

  it('switches the preset through the value popover', async () => {
    const filter: ListFilter = {
      kind: 'date',
      field: 'createdAt',
      mode: 'preset',
      condition: 'withinLast',
      preset: '1week',
    };
    const listFilters = makeListFilters([filter]);
    const { user } = render(<FilterBadges listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: '1 week ago' }));
    await user.click(await screen.findByRole('button', { name: '3 months ago' }));

    expect(listFilters.updateFilter).toHaveBeenCalledWith(0, { ...filter, preset: '3months' });
  });

  it('keeps at least one type value checked in the value popover', async () => {
    const listFilters = makeListFilters([{ kind: 'type', condition: 'is', values: ['picture'] }]);
    const { user } = render(<FilterBadges listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: 'Picture' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Picture' }));

    expect(listFilters.updateFilter).not.toHaveBeenCalled();
  });

  it('removes a badge via its remove button', async () => {
    const listFilters = makeListFilters([{ kind: 'type', condition: 'is', values: ['picture'] }]);
    const { user } = render(<FilterBadges listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: 'Remove Type filter' }));

    expect(listFilters.removeFilter).toHaveBeenCalledWith(0);
  });

  it('renders a range badge with formatted dates and edits via the calendar', async () => {
    const filter: ListFilter = {
      kind: 'date',
      field: 'createdAt',
      mode: 'range',
      condition: 'is',
      from: '2024-01-01',
      to: '2024-04-07',
    };
    const listFilters = makeListFilters([filter]);
    const { user } = render(<FilterBadges listFilters={listFilters} />);

    const badge = screen.getByTestId('filter-badge');
    expect(badge).toHaveTextContent('Creation date');
    expect(badge).toHaveTextContent(/Jan/);
    expect(badge).toHaveTextContent(/Apr/);

    await user.click(screen.getByRole('button', { name: /Jan/ }));
    expect(await screen.findByTestId('date-range-calendar')).toBeInTheDocument();
  });
});
