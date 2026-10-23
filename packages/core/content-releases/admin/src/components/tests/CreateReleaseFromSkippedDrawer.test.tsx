import * as React from 'react';

import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import {
  COLLAPSED_ENTRIES_COUNT,
  CreateReleaseFromSkippedDrawer,
} from '../CreateReleaseFromSkippedDrawer';

const skippedAction = (id: number, title: string, type: 'publish' | 'unpublish' = 'publish') => ({
  id,
  type,
  entryDocumentId: `doc-${id}`,
  entry: { id, documentId: `doc-${id}` },
  contentType: { uid: 'api::article.article', displayName: 'Article', mainFieldValue: title },
  locale: { code: 'en', name: 'English (en)' },
  status: 'draft',
  isEntryValid: true,
  outcome: 'skipped_invalid',
  reason: null,
});

const mockSkippedEntries = (
  actions: ReturnType<typeof skippedAction>[],
  total = actions.length
) => {
  server.use(
    http.get('/content-releases/:releaseId/actions', ({ request }) => {
      expect(new URL(request.url).searchParams.get('filter')).toBe('skipped');

      return HttpResponse.json({
        data: { Article: actions },
        meta: {
          pagination: { page: 1, pageSize: 100, total, pageCount: 1 },
          contentTypes: {},
          components: {},
        },
      });
    }),
    http.get('/content-releases/settings', () =>
      HttpResponse.json({ data: { defaultTimezone: null } })
    )
  );
};

const captureCreateRequest = () => {
  const requestBody = jest.fn();

  server.use(
    http.post('/content-releases/:releaseId/create-from-skipped-entries', async ({ request }) => {
      requestBody(await request.json());

      return HttpResponse.json({ data: { id: 42, name: 'Autumn campaign – skipped entries' } });
    })
  );

  return requestBody;
};

const renderDrawer = () =>
  render(
    <CreateReleaseFromSkippedDrawer
      release={{ id: 1, name: 'Autumn campaign' }}
      open
      onClose={jest.fn()}
    />
  );

describe('CreateReleaseFromSkippedDrawer', () => {
  it('lists the skipped entries and defaults to requiring every entry to be ready', async () => {
    mockSkippedEntries([
      skippedAction(1, 'Spring sale'),
      skippedAction(2, 'Summer sale', 'unpublish'),
    ]);

    renderDrawer();

    expect(await screen.findByText('2 entries carried over')).toBeInTheDocument();
    expect(screen.getByText('Spring sale')).toBeInTheDocument();
    expect(screen.getByText('Unpublish')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Release name' })).toHaveValue(
      'Autumn campaign – skipped entries'
    );
    expect(screen.getByRole('radio', { name: 'Require every entry to be ready' })).toBeChecked();
  });

  it('collapses long lists behind "Show more"', async () => {
    // One more than the collapsed list shows
    const count = COLLAPSED_ENTRIES_COUNT + 1;
    mockSkippedEntries(
      Array.from({ length: count }, (_, index) => skippedAction(index + 1, `Entry ${index + 1}`))
    );

    const { user } = renderDrawer();

    await screen.findByText(`${count} entries carried over`);
    expect(screen.getByText(`Entry ${COLLAPSED_ENTRIES_COUNT}`)).toBeInTheDocument();
    expect(screen.queryByText(`Entry ${count}`)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getByText(`Entry ${count}`)).toBeInTheDocument();
  });

  it('carries over every skipped entry when none is removed', async () => {
    mockSkippedEntries([skippedAction(1, 'Spring sale'), skippedAction(2, 'Summer sale')]);
    const requestBody = captureCreateRequest();

    const { user } = renderDrawer();

    await screen.findByText('2 entries carried over');
    await user.click(screen.getByRole('checkbox', { name: "I don't have a release date yet" }));
    fireEvent.click(screen.getByRole('button', { name: 'Create release' }));

    await waitFor(() => expect(requestBody).toHaveBeenCalled());
    expect(requestBody).toHaveBeenCalledWith({
      name: 'Autumn campaign – skipped entries',
      scheduledAt: null,
      timezone: null,
      releaseCondition: 'all_or_nothing',
    });
  });

  it('only carries over the entries left in the list', async () => {
    mockSkippedEntries([skippedAction(1, 'Spring sale'), skippedAction(2, 'Summer sale')]);
    const requestBody = captureCreateRequest();

    const { user } = renderDrawer();

    await screen.findByText('2 entries carried over');
    await user.click(screen.getByRole('button', { name: 'Remove Spring sale' }));
    expect(screen.getByText('1 entry carried over')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: "I don't have a release date yet" }));
    await user.click(screen.getByRole('radio', { name: 'Release all ready items' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create release' }));

    await waitFor(() => expect(requestBody).toHaveBeenCalled());
    expect(requestBody).toHaveBeenCalledWith(
      expect.objectContaining({ actionIds: [2], releaseCondition: 'allow_partial' })
    );
  });

  it('lists every skipped entry again when reopened after removing one', async () => {
    mockSkippedEntries([skippedAction(1, 'Spring sale'), skippedAction(2, 'Summer sale')]);

    // The details page keeps the panel mounted and toggles `open`
    const DrawerOnPage = () => {
      const [open, setOpen] = React.useState(true);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open panel
          </button>
          <CreateReleaseFromSkippedDrawer
            release={{ id: 1, name: 'Autumn campaign' }}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      );
    };

    const { user } = render(<DrawerOnPage />);

    await screen.findByText('2 entries carried over');
    await user.click(screen.getByRole('button', { name: 'Remove Spring sale' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open panel' }));

    expect(await screen.findByText('2 entries carried over')).toBeInTheDocument();
    expect(screen.getByText('Spring sale')).toBeInTheDocument();
  });

  it("doesn't let entries be removed when some skipped entries weren't loaded", async () => {
    mockSkippedEntries([skippedAction(1, 'Spring sale'), skippedAction(2, 'Summer sale')], 150);

    renderDrawer();

    await screen.findByText('150 entries carried over');
    expect(screen.getByRole('button', { name: 'Remove Spring sale' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});
