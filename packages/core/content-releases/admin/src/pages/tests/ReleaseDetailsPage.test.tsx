import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

import { mockReleaseDetailsPageData } from './mockReleaseDetailsPageData';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
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

    const { user } = render(<ReleaseDetailsPage />, {
      initialEntries: [{ pathname: `/content-releases/1` }],
    });

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

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    expect(publishButton).toBeInTheDocument();
    expect(publishButton).toBeDisabled();

    const noContent = screen.getByText(/This release is empty./i);
    expect(noContent).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeInTheDocument();

    const createdByAuthor = screen.getByText(/by Admin Admin/i);
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

    render(<ReleaseDetailsPage />, {
      initialEntries: [{ pathname: `/content-releases/1` }],
    });

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseSubtitle = await screen.findAllByText('1 entry');
    expect(releaseSubtitle[0]).toBeInTheDocument();

    // should show the entries
    expect(
      screen.getByText(
        mockReleaseDetailsPageData.withActionsBodyData.data[0].entry.contentType.mainFieldValue
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        mockReleaseDetailsPageData.withActionsBodyData.data[0].entry.contentType.displayName
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockReleaseDetailsPageData.withActionsBodyData.data[0].entry.locale.name)
    ).toBeInTheDocument();

    // There is one column with actions and the right one is checked
    expect(screen.getByRole('radio', { name: 'publish' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'unpublish' })).not.toBeChecked();

    const paginationCombobox = screen.queryByRole('combobox', { name: /entries per page/i });
    expect(paginationCombobox).toBeInTheDocument();
  });

  it('renders the details page with no action buttons if release is published', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsAndPublishedHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsBodyData))
      )
    );

    render(<ReleaseDetailsPage />, {
      initialEntries: [{ pathname: `/content-releases/1` }],
    });

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    // There is no publish button because it's already published
    const publishButton = screen.queryByRole('button', { name: 'Publish' });
    expect(publishButton).not.toBeInTheDocument();

    expect(screen.queryByRole('radio', { name: 'publish' })).not.toBeInTheDocument();
    const container = screen.getByText(/This entry was/);
    expect(container.querySelector('span')).toHaveTextContent('published');
  });
});
