import { render, screen } from '@tests/utils';

import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders the title, description and Add assets action', () => {
    render(<EmptyState onAddAssets={jest.fn()} />);

    expect(screen.getByText('No assets yet')).toBeInTheDocument();
    expect(
      screen.getByText('Get started by uploading items or creating the folder.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add assets' })).toBeInTheDocument();
  });

  it('calls onAddAssets when the button is clicked', async () => {
    const onAddAssets = jest.fn();
    const { user } = render(<EmptyState onAddAssets={onAddAssets} />);

    await user.click(screen.getByRole('button', { name: 'Add assets' }));

    expect(onAddAssets).toHaveBeenCalledTimes(1);
  });
});
