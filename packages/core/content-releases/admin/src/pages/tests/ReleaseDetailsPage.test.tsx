import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockImplementation(() => ({ releaseId: '1' })),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element}) => <div>{children}</div>
}));

describe('Release details page', () => {
  it('renders correctly the heading content', async () => {
    server.use(
      rest.put('/content-releases/1', (req, res, ctx) =>
        res(
          ctx.json({
            data: {
              id: 2,
              name: 'Release title focus',
              releasedAt: null,
              createdAt: '2023-11-30T16:02:40.908Z',
              updatedAt: '2023-12-01T11:12:04.441Z',
            },
          })
        )
      )
    );
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
