import { useRBAC } from '@strapi/admin/strapi-admin';
import { within } from '@testing-library/react';
import { render, server, screen } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

import { mockReleaseDetailsPageData } from './mockReleaseDetailsPageData';

/**
 * Mocking the useDocument hook to avoid validation errors for testing
 */
jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canDelete: true, canPublish: true },
  })),
}));

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  ...jest.requireActual('@strapi/content-manager/strapi-admin'),
  unstable_useDocument: jest.fn().mockReturnValue({ validate: jest.fn().mockReturnValue({}) }),
}));

describe.skip('Releases details page', () => {
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

    const { user } = render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      {
        initialEntries: [{ pathname: `/content-releases/1` }],
      }
    );

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.noActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseSubtitle = await screen.findAllByText('No entries');
    expect(releaseSubtitle[0]).toBeInTheDocument();

    const releaseStatus = screen.getByText('empty');
    expect(releaseStatus).toBeInTheDocument();

    const moreButton = screen.getByRole('button', { name: 'Release edit and delete menu' });
    expect(moreButton).toBeInTheDocument();

    const publishButton = await screen.findByRole('button', { name: 'Publish' });
    expect(publishButton).toBeInTheDocument();
    expect(publishButton).toBeDisabled();

    const noContent = screen.getByText(/This release is empty./i);
    expect(noContent).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editMenuItem = screen.getByRole('menuitem', { name: 'Edit' });
    expect(editMenuItem).toBeInTheDocument();

    const deleteMenuItem = screen.getByRole('menuitem', { name: 'Delete' });
    expect(deleteMenuItem).toBeInTheDocument();

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

    const { user } = render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      {
        initialEntries: [{ pathname: `/content-releases/1` }],
        userEventOptions: {
          skipHover: true,
        },
      }
    );

    await screen.findByText(mockReleaseDetailsPageData.noActionsHeaderData.data.name);

    const moreButton = screen.getByRole('button', { name: 'Release edit and delete menu' });
    expect(moreButton).toBeInTheDocument();

    await user.click(moreButton);

    // shows the popover actions
    const editMenuItem = screen.getByRole('menuitem', { name: 'Edit' });
    expect(editMenuItem).toHaveAttribute('aria-disabled', 'true');

    const deleteMenuItem = screen.getByRole('menuitem', { name: 'Delete' });
    expect(deleteMenuItem).toHaveAttribute('aria-disabled', 'true');
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

    render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      {
        initialEntries: [{ pathname: `/content-releases/1` }],
      }
    );

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const tables = screen.getAllByRole('grid');

    expect(tables).toHaveLength(2);
  });

  it('shows the right status for unpublished release', async () => {
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

    render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      {
        initialEntries: [{ pathname: `/content-releases/1` }],
      }
    );

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseStatus = screen.getByText('ready');
    expect(releaseStatus).toBeInTheDocument();
    expect(releaseStatus).toHaveStyle(`color: #328048`);

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

  it('shows the right release status for published release', async () => {
    server.use(
      rest.get('/content-releases/:releaseId', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withActionsAndPublishedHeaderData))
      )
    );

    server.use(
      rest.get('/content-releases/:releaseId/actions', (req, res, ctx) =>
        res(ctx.json(mockReleaseDetailsPageData.withMultipleActionsBodyData))
      )
    );

    render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      {
        initialEntries: [{ pathname: `/content-releases/3` }],
      }
    );

    const releaseTitle = await screen.findByText(
      mockReleaseDetailsPageData.withActionsAndPublishedHeaderData.data.name
    );
    expect(releaseTitle).toBeInTheDocument();

    const releaseStatus = screen.getByText('done');
    expect(releaseStatus).toBeInTheDocument();
    expect(releaseStatus).toHaveStyle(`color: #4945ff`);
  });
});
