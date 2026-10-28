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
      await screen.findByRole('button', { name: 'Create release from skipped' })
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
      screen.queryByRole('button', { name: 'Create release from skipped' })
    ).not.toBeInTheDocument();
  });

  it('offers it when some skipped entries were not loaded', async () => {
    mockRelease(partialRelease, [skippedAction(1, null)], 150);

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Create release from skipped' })
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
      screen.queryByRole('button', { name: 'Create release from skipped' })
    ).not.toBeInTheDocument();
  });
});

describe('Release details tabs, header and rows', () => {
  const plannedRelease = {
    ...mockReleaseDetailsPageData.withActionsHeaderData.data,
    status: 'blocked',
    releaseCondition: 'all_or_nothing',
    failureReason: null,
    totalPublishedEntries: null,
    totalUnpublishedEntries: null,
    totalSkippedEntries: null,
    actions: { meta: { count: 3, notReadyCount: 1 } },
  };

  const partialRelease = {
    ...mockReleaseDetailsPageData.withActionsAndPublishedHeaderData.data,
    status: 'partial',
    releaseCondition: 'allow_partial',
    failureReason: null,
    totalPublishedEntries: 7,
    totalUnpublishedEntries: 1,
    totalSkippedEntries: 2,
    actions: { meta: { count: 10 } },
  };

  const action = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    type: 'publish',
    entryDocumentId: `doc-${id}`,
    entry: { id, documentId: `doc-${id}` },
    contentType: {
      uid: 'api::article.article',
      displayName: 'Article',
      mainFieldValue: `article ${id}`,
    },
    locale: null,
    status: 'draft',
    isEntryValid: true,
    outcome: null,
    reason: null,
    ...overrides,
  });

  const mockRelease = (release: Record<string, unknown>, actions: unknown[]) => {
    const actionsRequest = jest.fn();

    server.use(
      http.get('/content-releases/:releaseId', () => HttpResponse.json({ data: release })),
      http.get('/content-releases/:releaseId/actions', ({ request }) => {
        actionsRequest(new URL(request.url).searchParams.get('filter'));

        return HttpResponse.json({
          data: actions.length > 0 ? { Article: actions } : [],
          meta: {
            pagination: { page: 1, pageSize: 10, total: actions.length, pageCount: 1 },
            contentTypes: {},
            components: {},
          },
        });
      })
    );

    return actionsRequest;
  };

  const renderPage = (search = '') =>
    render(
      <Routes>
        <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
      </Routes>,
      { initialEntries: [{ pathname: `/content-releases/3`, search }] }
    );

  beforeEach(() => {
    jest.mocked(useRBAC).mockReturnValue({
      isLoading: false,
      allowedActions: { canUpdate: true, canDelete: true, canPublish: true },
    } as unknown as ReturnType<typeof useRBAC>);
  });

  it('counts the entries of a planned release by readiness', async () => {
    const actionsRequest = mockRelease(plannedRelease, [action(1)]);

    const { user } = renderPage();

    expect(await screen.findByRole('tab', { name: 'All (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ready (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Not ready (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Not ready/ }));

    await waitFor(() => expect(actionsRequest).toHaveBeenLastCalledWith('notReady'));
  });

  it('keeps Publish enabled on a blocked release, since the run re-checks the entries', async () => {
    mockRelease(plannedRelease, [action(1)]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('disables Publish on an empty release', async () => {
    mockRelease({ ...plannedRelease, status: 'empty', actions: { meta: { count: 0 } } }, []);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('enables Publish on a ready release', async () => {
    mockRelease({ ...plannedRelease, status: 'ready' }, [action(1)]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('shows what the run did to each entry right after publishing', async () => {
    let hasRun = false;

    server.use(
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json({
          data: hasRun
            ? { ...partialRelease, status: 'done', totalSkippedEntries: 0 }
            : { ...plannedRelease, id: partialRelease.id, status: 'ready' },
        })
      ),
      http.get('/content-releases/:releaseId/actions', () =>
        HttpResponse.json({
          data: { Article: [action(1, { outcome: hasRun ? 'published' : null })] },
          meta: {
            pagination: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
            contentTypes: {},
            components: {},
          },
        })
      ),
      http.post('/content-releases/:releaseId/publish', () => {
        hasRun = true;

        return HttpResponse.json({
          data: partialRelease,
          meta: { totalEntries: 1, totalPublishedEntries: 1, totalUnpublishedEntries: 0 },
        });
      })
    );

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Done')).toBeVisible();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('sums what a run released and skipped', async () => {
    const actionsRequest = mockRelease(partialRelease, [
      action(1, { outcome: 'published' }),
      action(2, { type: 'unpublish', outcome: 'unpublished' }),
      action(3, { outcome: 'skipped_held' }),
    ]);

    const { user } = renderPage();

    expect(await screen.findByText('Released 8 of 10 entries', { exact: false })).toBeVisible();
    expect(screen.getByText('2 skipped')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'All (10)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Released (8)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Skipped (2)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();

    expect(screen.getAllByText('Done')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Why article 3 was skipped' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'Unpublish' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /^Skipped/ }));

    await waitFor(() => expect(actionsRequest).toHaveBeenLastCalledWith('skipped'));
  });

  it('ignores a filter the release has no tab for', async () => {
    const actionsRequest = mockRelease(partialRelease, [action(1, { outcome: 'published' })]);

    renderPage('?filter=notReady');

    await screen.findByText('Released 8 of 10 entries', { exact: false });
    await waitFor(() => expect(actionsRequest).toHaveBeenCalledWith(null));
    expect(actionsRequest).not.toHaveBeenCalledWith('notReady');
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('greys out an entry deleted since the run', async () => {
    mockRelease(partialRelease, [
      action(1, {
        entry: null,
        contentType: { uid: 'api::article.article', displayName: 'Article' },
        status: null,
        outcome: 'skipped_invalid',
        reason: { validation: { errors: [{ path: ['title'], message: 'required' }] } },
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Deleted entry')).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Why Deleted entry was skipped',
      })
    ).toBeVisible();
  });

  it('opens why an entry isn’t ready from its badge, and steps to the next one', async () => {
    mockRelease(plannedRelease, [
      action(1, {
        isEntryValid: false,
        reason: {
          validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] },
        },
      }),
      action(2),
      action(3, { isEntryValid: false, reason: null }),
    ]);

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Why article 1 isn’t ready' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('1 of 2 entries not ready')).toBeInTheDocument();
    expect(within(dialog).getByText('article 1')).toBeInTheDocument();
    expect(within(dialog).getByText('Title')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    expect(await within(dialog).findByText('article 3')).toBeInTheDocument();
    expect(within(dialog).getByText('The entry couldn’t be validated')).toBeInTheDocument();
  });

  it('names an entry with an empty main field "Untitled", not by its id', async () => {
    mockRelease({ ...plannedRelease, status: 'ready' }, [
      action(76, {
        contentType: { uid: 'api::article.article', displayName: 'Article', mainFieldValue: null },
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Untitled')).toBeVisible();
    expect(screen.queryByRole('gridcell', { name: '76' })).not.toBeInTheDocument();
  });

  it("doesn't count anything for a release that failed before the upgrade", async () => {
    mockRelease(
      {
        ...partialRelease,
        status: 'failed',
        failureReason: 'failed_before_upgrade',
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 10,
      },
      [action(1, { outcome: 'skipped_missed' })]
    );

    renderPage();

    expect(await screen.findByText('Unknown')).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab')).toHaveTextContent(/^All$/);
    expect(screen.queryByText(/Released \d+ of/)).not.toBeInTheDocument();
    expect(screen.queryByText(/skipped$/)).not.toBeInTheDocument();
  });

  it('says when a release ran with no entries', async () => {
    mockRelease(
      {
        ...partialRelease,
        status: 'done',
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 0,
        actions: { meta: { count: 0 } },
      },
      []
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText('This release ran with no entries.')).toHaveLength(2)
    );
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Open the Content Manager')).not.toBeInTheDocument();
  });
});
