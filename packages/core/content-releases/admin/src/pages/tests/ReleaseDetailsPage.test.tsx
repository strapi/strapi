import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

import { mockReleaseDetailsPageData } from './mockReleaseDetailsPageData';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element}) => <div>{children}</div>
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockImplementation(() => ({ releaseId: '1' })),
}));

describe('Releases details page', () => {
  it('renders the details page with no actions', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.noActionsHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.noActionsBodyData))
      )
    );

    const { user } = render(<ReleaseDetailsPage />);

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.noActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseSubtitle = await screen.findAllByText('No entries');
    expect(releaseSubtitle[0]).toBeInTheDocument();

    const moreButton = screen.getByRole('button', { name: 'Release actions' });
    expect(moreButton).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton).toBeInTheDocument();

    const releaseButton = screen.getByRole('button', { name: 'Release' });
    expect(releaseButton).toBeInTheDocument();

    const noContent = screen.getByText(/This release is empty./i);
    expect(noContent).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeInTheDocument();

    const createdByAuthor = screen.getByText(/by John Doe/i);
    expect(createdByAuthor).toBeInTheDocument();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).not.toBeInTheDocument();
  });

  it('renders the details page with actions', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsBodyData))
      )
    );

    render(<ReleaseDetailsPage />);

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseSubtitle = await screen.findAllByText('1 entry');
    expect(releaseSubtitle[0]).toBeInTheDocument();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).toBeInTheDocument();
  });
});
