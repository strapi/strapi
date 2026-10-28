import { useRBAC } from '@strapi/admin/strapi-admin';
import { within } from '@testing-library/react';
import { fireEvent, render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { getSkippedEntriesQuery } from '../../components/CreateReleaseFromSkippedDrawer';
import { useGetReleaseActionsQuery } from '../../services/release';
import { ReleaseDetailsPage } from '../ReleaseDetailsPage';

import { mockReleaseDetailsPageData } from './mockReleaseDetailsPageData';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canDelete: true, canPublish: true },
  })),
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

    expect(screen.getByText('Empty')).toBeInTheDocument();

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

    expect(screen.getByText('Ready')).toBeInTheDocument();

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

    expect(screen.getByText('Done')).toBeInTheDocument();
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
    mockRelease(partialRelease, [skippedAction(1, null), skippedAction(2, null)]);

    // Reads the page's skipped entries query from the same cache entry, so it shows the response
    // in the same render as the page
    const SkippedEntriesLoaded = () => {
      const { data } = useGetReleaseActionsQuery(getSkippedEntriesQuery('3'));

      return data ? <p>Skipped entries loaded</p> : null;
    };

    render(
      <>
        <Routes>
          <Route path="/content-releases/:releaseId" element={<ReleaseDetailsPage />} />
        </Routes>
        <SkippedEntriesLoaded />
      </>,
      { initialEntries: [{ pathname: `/content-releases/3` }] }
    );

    await screen.findByText(partialRelease.data.name);
    await screen.findByText('Skipped entries loaded');
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

  it('says why the publish of a blocked release was refused', async () => {
    mockRelease(plannedRelease, [action(1)]);
    server.use(
      http.post('/content-releases/:releaseId/publish', () =>
        HttpResponse.json(
          {
            data: null,
            error: {
              status: 400,
              name: 'ValidationError',
              message: 'title must be defined.',
              details: {},
            },
          },
          { status: 400 }
        )
      )
    );

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('title must be defined.')).toBeInTheDocument();
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

    // The row's outcome, not the release's status badge, which reads "Done" too
    expect(await screen.findByRole('gridcell', { name: 'Done' })).toBeVisible();
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

  const mockReasonRows = (
    release: Record<string, unknown>,
    { page, reasons }: { page: Record<string, unknown[]>; reasons: Record<string, unknown[]> }
  ) => {
    const reasonRequests = jest.fn();
    const respond = (data: Record<string, unknown[]>, total: number) =>
      HttpResponse.json({
        data,
        meta: {
          pagination: { page: 1, pageSize: 10, total, pageCount: 1 },
          contentTypes: {},
          components: {},
        },
      });

    server.use(
      http.get('/content-releases/:releaseId', () => HttpResponse.json({ data: release })),
      http.get('/content-releases/:releaseId/actions', ({ request }) => {
        const filter = new URL(request.url).searchParams.get('filter');
        if (filter === 'notReady' || filter === 'skipped') {
          reasonRequests(filter);
          return respond(reasons, Object.values(reasons).flat().length);
        }
        return respond(page, Object.values(page).flat().length + 10);
      })
    );

    return reasonRequests;
  };

  const category = (id: number, overrides: Record<string, unknown> = {}) =>
    action(id, {
      contentType: {
        uid: 'api::category.category',
        displayName: 'Category',
        mainFieldValue: `category ${id}`,
      },
      ...overrides,
    });

  it('steps through every entry not ready, beyond the page and the group', async () => {
    const notValidated = action(1, {
      isEntryValid: false,
      reason: { validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] } },
    });
    const unrecorded = action(3, { isEntryValid: false, reason: null });
    const reasonRequests = mockReasonRows(
      { ...plannedRelease, actions: { meta: { count: 14, notReadyCount: 3 } } },
      {
        page: {
          Article: [
            notValidated,
            action(2),
            unrecorded,
            action(4, { type: 'unpublish', isEntryValid: false }),
          ],
        },
        reasons: {
          Article: [unrecorded, notValidated],
          Category: [category(5, { isEntryValid: null, reason: null })],
        },
      }
    );

    const { user } = renderPage();

    const notReadyBadge = await screen.findByRole('button', { name: 'Why article 1 isn’t ready' });
    expect(
      screen.queryByRole('button', { name: 'Why article 4 isn’t ready' })
    ).not.toBeInTheDocument();
    await user.click(notReadyBadge);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(reasonRequests).toHaveBeenCalledWith('notReady'));
    expect(await within(dialog).findByText('1 of 3 entries not ready')).toBeInTheDocument();
    expect(within(dialog).getByText('Not ready: Validation error')).toBeInTheDocument();
    expect(within(dialog).getByText('Title')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    expect(await within(dialog).findByText('article 3')).toBeInTheDocument();
    expect(within(dialog).getByText('Not ready')).toBeInTheDocument();
    expect(within(dialog).getByText(/wasn’t recorded/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    expect(await within(dialog).findByText('category 5')).toBeInTheDocument();
    expect(within(dialog).getByText('Not ready: Not checked yet')).toBeInTheDocument();
    expect(within(dialog).getByText(/hasn’t been checked yet/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  // `count` entries not ready, the table showing those from `tableStart`, by 10. The server pages
  // the entries not ready by the request's `pageSize`.
  const mockManyNotReady = (count: number, tableStart = 0) => {
    const notReady = Array.from({ length: count }, (_, index) =>
      action(index + 1, { isEntryValid: false })
    );
    const respond = (rows: unknown[], pageSize: number) =>
      HttpResponse.json({
        data: { Article: rows },
        meta: {
          pagination: { page: 1, pageSize, total: count, pageCount: Math.ceil(count / pageSize) },
          contentTypes: {},
          components: {},
        },
      });

    server.use(
      http.get('/content-releases/:releaseId', () =>
        HttpResponse.json({
          data: { ...plannedRelease, actions: { meta: { count, notReadyCount: count } } },
        })
      ),
      http.get('/content-releases/:releaseId/actions', ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get('filter') === 'notReady') {
          const pageSize = Number(params.get('pageSize'));
          return respond(notReady.slice(0, pageSize), pageSize);
        }
        return respond(notReady.slice(tableStart, tableStart + 10), 10);
      })
    );
  };

  it('steps through more entries not ready than load at once', async () => {
    mockManyNotReady(101);

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Why article 1 isn’t ready' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('1 of 101 entries not ready')).toBeInTheDocument();

    // To the last entry of the first load (`fireEvent`: a hundred user clicks take seconds)
    const next = within(dialog).getByRole('button', { name: 'Next' });
    for (let step = 1; step < 100; step++) {
      fireEvent.click(next);
    }
    expect(within(dialog).getByText('100 of 101 entries not ready')).toBeInTheDocument();

    // Then past it
    fireEvent.click(next);

    expect(await within(dialog).findByText('101 of 101 entries not ready')).toBeInTheDocument();
    expect(within(dialog).getByText('article 101')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('loads the entries not ready up to a row the first load lacks', async () => {
    mockManyNotReady(201, 140);

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Why article 150 isn’t ready' }));

    const dialog = await screen.findByRole('dialog');
    // The table's rows come first
    expect(await within(dialog).findByText('10 of 201 entries not ready')).toBeInTheDocument();
    expect(within(dialog).getByText('article 150')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('steps through the skipped entries of a run, a deleted one included', async () => {
    const deleted = action(1, {
      entry: null,
      outcome: 'skipped_invalid',
      reason: { validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] } },
    });
    const held = action(3, { outcome: 'skipped_held' });
    mockReasonRows(partialRelease, {
      page: { Article: [deleted, action(2, { outcome: 'published' }), held] },
      reasons: { Article: [deleted, held] },
    });

    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Why Deleted entry was skipped' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('1 of 2 skipped entries')).toBeInTheDocument();
    expect(within(dialog).getByText('Deleted entry')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Go to entry' })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    expect(await within(dialog).findByText('article 3')).toBeInTheDocument();
    expect(within(dialog).getByText('Skipped: Waiting on other entries')).toBeInTheDocument();
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

    // In the header, and in place of the table
    const message = 'This release ran with no entries.';
    await screen.findByRole('heading', { level: 1 });
    // The header has no role to find it by
    // eslint-disable-next-line testing-library/no-node-access
    const header = document.querySelector<HTMLElement>('[data-strapi-header]') as HTMLElement;
    const inHeader = await within(header).findByText(message);
    expect(inHeader).toBeVisible();
    await waitFor(() =>
      expect(screen.getAllByText(message).filter((element) => element !== inHeader)).toHaveLength(1)
    );
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Open the Content Manager')).not.toBeInTheDocument();
  });
});
