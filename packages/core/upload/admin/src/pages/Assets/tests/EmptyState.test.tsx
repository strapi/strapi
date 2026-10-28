import { render, screen } from '@tests/utils';

import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders the title, description and Add assets action', () => {
    render(<EmptyState onAddAssets={jest.fn()} canAddAssets />);

    expect(screen.getByText('No assets yet')).toBeInTheDocument();
    expect(
      screen.getByText('Get started by uploading assets or creating a folder.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add assets' })).toBeInTheDocument();
  });

  it('calls onAddAssets when the button is clicked', async () => {
    const onAddAssets = jest.fn();
    const { user } = render(<EmptyState onAddAssets={onAddAssets} canAddAssets />);

    await user.click(screen.getByRole('button', { name: 'Add assets' }));

    expect(onAddAssets).toHaveBeenCalledTimes(1);
  });

  it('hides the Add assets action when canAddAssets is false', () => {
    render(<EmptyState onAddAssets={jest.fn()} canAddAssets={false} />);

    expect(screen.getByText('No assets yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add assets' })).not.toBeInTheDocument();
  });

  describe('when searching', () => {
    it('renders no-results copy including the query', () => {
      render(
        <EmptyState
          onAddAssets={jest.fn()}
          canAddAssets
          searchQuery="kitten"
          onClearSearch={jest.fn()}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(
        screen.getByText('No assets or folders match "kitten". Try a different search.')
      ).toBeInTheDocument();
    });

    it('replaces "Add assets" with "Clear search"', () => {
      render(
        <EmptyState
          onAddAssets={jest.fn()}
          canAddAssets
          searchQuery="kitten"
          onClearSearch={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add assets' })).not.toBeInTheDocument();
    });

    it('calls onClearSearch when the button is clicked', async () => {
      const onClearSearch = jest.fn();
      const { user } = render(
        <EmptyState
          onAddAssets={jest.fn()}
          canAddAssets
          searchQuery="kitten"
          onClearSearch={onClearSearch}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Clear search' }));

      expect(onClearSearch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the no-assets state when the query is empty', () => {
      render(
        <EmptyState onAddAssets={jest.fn()} canAddAssets searchQuery="" onClearSearch={jest.fn()} />
      );

      expect(screen.getByText('No assets yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add assets' })).toBeInTheDocument();
    });
  });
});
