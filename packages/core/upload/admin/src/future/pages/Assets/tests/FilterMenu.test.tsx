import { render, screen } from '@tests/utils';

import { FilterMenu } from '../components/FilterMenu';

import type { ListFilter, ListFilters } from '../hooks/useListFilters';

const makeListFilters = (
  filters: ListFilter[] = [],
  overrides: Partial<ListFilters> = {}
): ListFilters => ({
  filters,
  serialized: '',
  addFilter: jest.fn(),
  updateFilter: jest.fn(),
  removeFilter: jest.fn(),
  clearFilters: jest.fn(),
  ...overrides,
});

describe('FilterMenu', () => {
  it('shows the three field submenus (file size stays out)', async () => {
    const { user } = render(<FilterMenu listFilters={makeListFilters()} />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Creation date')).toBeInTheDocument();
    expect(screen.getByText('Last modified')).toBeInTheDocument();
    expect(screen.queryByText('File size')).not.toBeInTheDocument();
  });

  it('shows the applied-filter count on the trigger', () => {
    render(
      <FilterMenu
        listFilters={makeListFilters([
          { kind: 'type', condition: 'is', values: ['picture'] },
          {
            kind: 'date',
            field: 'createdAt',
            mode: 'preset',
            condition: 'withinLast',
            preset: '1week',
          },
        ])}
      />
    );

    expect(screen.getByRole('button', { name: /Filter/ })).toHaveTextContent('2');
  });

  it('adds a type badge when checking a first value', async () => {
    const listFilters = makeListFilters();
    const { user } = render(<FilterMenu listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByText('Type'));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Picture' }));

    expect(listFilters.addFilter).toHaveBeenCalledWith({
      kind: 'type',
      condition: 'is',
      values: ['picture'],
    });
  });

  it('accumulates further checked values into the existing type badge', async () => {
    const existing: ListFilter = { kind: 'type', condition: 'is', values: ['picture'] };
    const listFilters = makeListFilters([existing]);
    const { user } = render(<FilterMenu listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: /Filter/ }));
    await user.click(screen.getByText('Type'));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Audio' }));

    expect(listFilters.updateFilter).toHaveBeenCalledWith(0, {
      kind: 'type',
      condition: 'is',
      values: ['picture', 'audio'],
    });
  });

  it('removes the type badge when the last value is unchecked', async () => {
    const existing: ListFilter = { kind: 'type', condition: 'is', values: ['picture'] };
    const listFilters = makeListFilters([existing]);
    const { user } = render(<FilterMenu listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: /Filter/ }));
    await user.click(screen.getByText('Type'));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Picture' }));

    // A type filter with no values is not a state — the badge goes away
    // instead of writing a malformed `type:is:` to the URL.
    expect(listFilters.removeFilter).toHaveBeenCalledWith(0);
    expect(listFilters.updateFilter).not.toHaveBeenCalled();
  });

  it('adds a withinLast preset badge from the Creation date submenu', async () => {
    const listFilters = makeListFilters();
    const { user } = render(<FilterMenu listFilters={listFilters} />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByText('Creation date'));
    await user.click(await screen.findByRole('menuitem', { name: '1 week ago' }));

    expect(listFilters.addFilter).toHaveBeenCalledWith({
      kind: 'date',
      field: 'createdAt',
      mode: 'preset',
      condition: 'withinLast',
      preset: '1week',
    });
  });

  it('offers the date range only under Creation date', async () => {
    const { user } = render(<FilterMenu listFilters={makeListFilters()} />);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByText('Last modified'));

    expect(await screen.findByRole('menuitem', { name: '1 year ago' })).toBeInTheDocument();
    expect(screen.queryByText('Select date range')).not.toBeInTheDocument();
  });
});
