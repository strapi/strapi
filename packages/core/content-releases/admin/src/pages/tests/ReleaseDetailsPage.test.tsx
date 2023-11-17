import { render, screen } from '@tests/utils';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

describe('Release details page', () => {
  it('renders correctly the heading content', async () => {
    const { user } = render(<ReleaseDetailsPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Release title');
    // if there are 0 entries
    expect(screen.getByText('No entries')).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).toBeInTheDocument();

    const releaseButton = screen.getByRole('button', { name: 'Release' });
    expect(releaseButton).toBeInTheDocument();

    const moreButton = screen.getByRole('button', { name: 'Release actions' });
    expect(moreButton).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeInTheDocument();
  });

  it('shows empty content if there are no entries', async () => {
    render(<ReleaseDetailsPage />);

    expect(screen.getByText('No entries')).toBeInTheDocument();
  });
});
