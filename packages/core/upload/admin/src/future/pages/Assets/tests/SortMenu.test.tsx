import { render, screen } from '@tests/utils';

import { SortMenu } from '../components/SortMenu';

import type { ListSort } from '../hooks/useListSort';

const makeSort = (overrides: Partial<ListSort> = {}): ListSort => ({
  sortBy: 'mostRecentUpdates',
  direction: null,
  foldersPosition: 'top',
  assetsSort: 'updatedAt:DESC',
  foldersSort: 'updatedAt:DESC',
  setSortBy: jest.fn(),
  setDirection: jest.fn(),
  setFoldersPosition: jest.fn(),
  ...overrides,
});

describe('SortMenu', () => {
  it('shows the active primary rule on the trigger and all options grouped', async () => {
    const { user } = render(<SortMenu sort={makeSort()} />);

    const trigger = screen.getByRole('button', { name: 'Sort: Most recent updates' });
    await user.click(trigger);

    expect(screen.getByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText('Sort direction')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();

    for (const label of [
      'Oldest uploads',
      'Most recent updates',
      'A to Z',
      'Z to A',
      'File size increasingly',
      'File size decreasingly',
      'On top',
      'Mixed with files',
    ]) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }
  });

  it('labels the trigger with the direction when the primary is cleared', () => {
    render(
      <SortMenu sort={makeSort({ sortBy: null, direction: 'nameAsc', assetsSort: 'name:ASC' })} />
    );

    expect(screen.getByRole('button', { name: 'Sort: A to Z' })).toBeInTheDocument();
  });

  it('selects a facet and keeps the menu open', async () => {
    const sort = makeSort();
    const { user } = render(<SortMenu sort={sort} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(screen.getByRole('menuitem', { name: 'A to Z' }));

    expect(sort.setDirection).toHaveBeenCalledWith('nameAsc');
    // preventDefault on select keeps the dropdown open for further tuning.
    expect(screen.getByRole('menuitem', { name: 'Z to A' })).toBeInTheDocument();
  });

  it('clicking the checked option clears the facet', async () => {
    const sort = makeSort();
    const { user } = render(<SortMenu sort={sort} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Most recent updates' }));

    expect(sort.setSortBy).toHaveBeenCalledWith(null);
  });

  it('switches the folders position', async () => {
    const sort = makeSort();
    const { user } = render(<SortMenu sort={sort} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Mixed with files' }));

    expect(sort.setFoldersPosition).toHaveBeenCalledWith('mixed');
  });
});
