import { render, screen } from '@tests/utils';

import { SortMenu } from '../components/SortMenu';

import type { ListSort } from '../hooks/useListSort';

const makeSort = (overrides: Partial<ListSort> = {}): ListSort => ({
  sortBy: 'mostRecentUpdates',
  direction: null,
  foldersPosition: 'top',
  assetsSort: 'updatedAt:DESC',
  // Default state keeps the folders band alphabetical — see useListSort.
  foldersSort: 'name:ASC',
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

    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();

    for (const label of [
      'Oldest uploads',
      'Most recent updates',
      'A to Z',
      'Z to A',
      'File size ascending',
      'File size descending',
      'On top',
      'Mixed with files',
    ]) {
      expect(screen.getByRole('menuitemradio', { name: label })).toBeInTheDocument();
    }
  });

  it('exposes the active option of each section as the checked radio', async () => {
    const { user } = render(<SortMenu sort={makeSort()} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));

    // The checkmark icon is aria-hidden, so aria-checked is the only thing
    // assistive tech has to go on.
    expect(screen.getByRole('menuitemradio', { name: 'Most recent updates' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'On top' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Oldest uploads' })).not.toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'A to Z' })).not.toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Mixed with files' })).not.toBeChecked();
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
    await user.click(screen.getByRole('menuitemradio', { name: 'A to Z' }));

    expect(sort.setDirection).toHaveBeenCalledWith('nameAsc');
    // preventDefault on select keeps the dropdown open for further tuning.
    expect(screen.getByRole('menuitemradio', { name: 'Z to A' })).toBeInTheDocument();
  });

  it('clicking the checked option clears the facet', async () => {
    const sort = makeSort();
    const { user } = render(<SortMenu sort={sort} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Most recent updates' }));

    expect(sort.setSortBy).toHaveBeenCalledWith(null);
  });

  it('hides the Folders group in grid view (showFoldersGroup=false)', async () => {
    const { user } = render(<SortMenu sort={makeSort()} showFoldersGroup={false} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));

    expect(screen.queryByText('Folders')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitemradio', { name: 'Mixed with files' })
    ).not.toBeInTheDocument();
    // The other groups stay.
    expect(screen.getByRole('menuitemradio', { name: 'A to Z' })).toBeInTheDocument();
  });

  it('switches the folders position', async () => {
    const sort = makeSort();
    const { user } = render(<SortMenu sort={sort} />);

    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Mixed with files' }));

    expect(sort.setFoldersPosition).toHaveBeenCalledWith('mixed');
  });
});
