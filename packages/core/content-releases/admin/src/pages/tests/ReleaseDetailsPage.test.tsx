import { useRBAC } from '@strapi/helper-plugin';
import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

import { mockReleaseDetailsPageData } from './mockReleaseDetailsPageData';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canDelete: true },
  })),
}));

/**
 * Mocking the useDocument hook to avoid validation errors for testing
 */
jest.mock('@strapi/admin/strapi-admin', () => ({
  unstable_useDocument: jest
    .fn()
    .mockReturnValue({ validate: jest.fn().mockReturnValue({ errors: {} }) }),
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
        mockReleaseDetailsPageData.withActionsBodyData.data['Category'][0].contentType
          .mainFieldValue
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', {
        name: mockReleaseDetailsPageData.withActionsBodyData.data['Category'][0].contentType
          .displayName,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        mockReleaseDetailsPageData.withActionsBodyData.data['Category'][0].locale.name
      )
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
    expect(screen.getByRole('gridcell', { name: /This entry was published/i })).toBeInTheDocument();
  });

  it('renders the details page with the delete and edit buttons disabled', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: false, canDelete: false },
    }));

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
      userEventOptions: {
        skipHover: true,
      },
    });

    await screen.findByText(mockReleaseDetailsPageData.noActionsHeaderData.data.name);

    const moreButton = screen.getByRole('button', { name: 'Release actions' });
    expect(moreButton).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeDisabled();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeDisabled();
  });

  it('renders as many tables as there are in the response', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withMultipleActionsBodyData))
      )
    );

    render(<ReleaseDetailsPage />, {
      initialEntries: [{ pathname: `/content-releases/1` }],
    });

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const tables = screen.getAllByRole('grid');

    expect(tables).toHaveLength(2);
  });

  it('show the right status based on the action and status', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withMultipleActionsBodyData))
      )
    );

    render(<ReleaseDetailsPage />, {
      initialEntries: [{ pathname: `/content-releases/1` }],
    });

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const cat1Row = screen.getByRole('row', { name: /cat1/i });
    expect(within(cat1Row).getByRole('gridcell', { name: 'Ready to publish' })).toBeInTheDocument();

    const cat2Row = screen.getByRole('row', { name: /cat2/i });
    expect(
      within(cat2Row).getByRole('gridcell', { name: 'Ready to unpublish' })
    ).toBeInTheDocument();

    const add1Row = screen.getByRole('row', { name: /add1/i });
    expect(
      within(add1Row).getByRole('gridcell', { name: 'Already published' })
    ).toBeInTheDocument();
  });
});
