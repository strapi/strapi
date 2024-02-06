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
  it('renders the details page with no release-actions', async () => {
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

    const moreButton = screen.getByRole('button', { name: 'Release edit and delete menu' });
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

    const moreButton = screen.getByRole('button', { name: 'Release edit and delete menu' });
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

  it('shows the right status', async () => {
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
