import { useRBAC } from '@strapi/admin/strapi-admin';
import { act, within } from '@testing-library/react';
import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
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
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json(mockReleaseDetailsPageData.noActionsHeaderData)
      )
    );

    server.use(
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(mockReleaseDetailsPageData.noActionsBodyData)
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
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json(mockReleaseDetailsPageData.noActionsHeaderData)
      )
    );

    server.use(
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(mockReleaseDetailsPageData.noActionsBodyData)
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
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withActionsHeaderData)
      )
    );

    server.use(
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withMultipleActionsBodyData)
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
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withActionsHeaderData)
      )
    );

    server.use(
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withMultipleActionsBodyData)
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
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withActionsAndPublishedHeaderData)
      )
    );

    server.use(
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json(mockReleaseDetailsPageData.withMultipleActionsBodyData)
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

describe('Create release from skipped entries', () => {
  const partialRelease = {
    data: {
      ...mockReleaseDetailsPageData.withActionsAndPublishedHeaderData.data,
      status: 'partial',
      releaseCondition: 'allow_partial',
      failureReason: null,
    },
  };

  const skippedAction = (id: number, entry: { id: number; documentId: string } | null) => ({
    id,
    type: 'publish',
    entryDocumentId: `doc-${id}`,
    entry,
    contentType: { uid: 'api::article.article', displayName: 'Article', mainFieldValue: null },
    locale: null,
    status: 'draft',
    isEntryValid: true,
    outcome: 'skipped_invalid',
    reason: null,
  });

  const mockRelease = (
    release: typeof partialRelease,
    skipped: ReturnType<typeof skippedAction>[],
    total = skipped.length
  ) => {
    const skippedRequest = jest.fn();

    server.use(
      http.get('/content-releases/:releaseId', () => HttpResponse.json(release)),
      http.get('/content-releases/:releaseId/actions', ({ request }) => {
        if (new URL(request.url).searchParams.get('filter') !== 'skipped') {
          return HttpResponse.json(mockReleaseDetailsPageData.noActionsBodyData);
        }

        skippedRequest();
        return HttpResponse.json({
          data: { Article: skipped },
          meta: {
            pagination: { page: 1, pageSize: 100, total, pageCount: 1 },
            contentTypes: {},
            components: {},
          },
        });
      })
    );

    return skippedRequest;
  };

  const renderPage = () =>
    render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      { initialEntries: [{ pathname: `/content-releases/3` }] }
    );

  beforeEach(() => {
    jest.mocked(useRBAC).mockReturnValue({
      isLoading: false,
      allowedActions: { canCreate: true, canCreateAction: true },
    } as unknown as ReturnType<typeof useRBAC>);
  });

  it('offers to create a release from the skipped entries', async () => {
    mockRelease(partialRelease, [skippedAction(1, { id: 1, documentId: 'doc-1' })]);

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Create release from skipped entries' })
    ).toBeInTheDocument();
  });

  it("doesn't offer it when every skipped entry has been deleted", async () => {
    const skippedRequest = mockRelease(partialRelease, [
      skippedAction(1, null),
      skippedAction(2, null),
    ]);

    renderPage();

    await screen.findByText(partialRelease.data.name);
    await waitFor(() => expect(skippedRequest).toHaveBeenCalled());
    // Let the page render the response
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(
      screen.queryByRole('button', { name: 'Create release from skipped entries' })
    ).not.toBeInTheDocument();
  });

  it('offers it when some skipped entries were not loaded', async () => {
    mockRelease(partialRelease, [skippedAction(1, null)], 150);

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Create release from skipped entries' })
    ).toBeInTheDocument();
  });

  it("doesn't offer it after a run that failed before the upgrade", async () => {
    const skippedRequest = mockRelease(
      {
        data: {
          ...partialRelease.data,
          status: 'failed',
          failureReason: 'failed_before_upgrade',
        },
      } as unknown as typeof partialRelease,
      [skippedAction(1, { id: 1, documentId: 'doc-1' })]
    );

    renderPage();

    await screen.findByText(partialRelease.data.name);
    expect(skippedRequest).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Create release from skipped entries' })
    ).not.toBeInTheDocument();
  });
});
