import { useAuth } from '@strapi/admin/strapi-admin';
import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { EntryReasonDrawer, type EntryReasonDetails } from '../EntryReasonDrawer';

import type { Release } from '../../../../shared/contracts/releases';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAuth: jest.fn(),
}));

const mockPermissions = (permissions: unknown[]) => {
  jest
    .mocked(useAuth)
    .mockImplementation((_name, selector) =>
      (selector as (state: { permissions: unknown[] }) => unknown)({ permissions })
    );
};

const READ_ARTICLES = [
  {
    action: 'plugin::content-manager.explorer.read',
    subject: 'api::article.article',
    properties: { locales: ['en'] },
  },
];

const details = (id: number, overrides: Partial<EntryReasonDetails> = {}): EntryReasonDetails => ({
  id,
  entryName: `Article ${id}`,
  isUntitled: false,
  isDeleted: false,
  contentTypeName: 'Article',
  localeCode: 'en',
  action: 'publish',
  outcome: 'skipped_invalid',
  reason: {
    validation: {
      errors: [
        { path: ['title'], message: 'title must be defined.' },
        { path: ['seo', 'metaTitle'], message: 'seo.metaTitle must be at most 60 characters' },
      ],
    },
  },
  location: {
    contentTypeUid: 'api::article.article',
    kind: 'collectionType',
    documentId: `doc-${id}`,
    locale: 'en',
    showErrors: true,
  },
  ...overrides,
});

type ReleaseDates = Pick<Release, 'releasedAt' | 'scheduledAt' | 'failureReason' | 'timezone'>;

const RAN_RELEASE: ReleaseDates = {
  releasedAt: '2026-09-30T09:00:00.000Z',
  scheduledAt: '2026-09-30T09:00:00.000Z',
  failureReason: null,
  timezone: 'Europe/Paris',
};

const renderDrawer = (
  items: EntryReasonDetails[],
  {
    selectedId = items[0].id,
    release = RAN_RELEASE,
  }: {
    selectedId?: EntryReasonDetails['id'];
    release?: ReleaseDates;
  } = {}
) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const view = render(
    <EntryReasonDrawer
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      onClose={onClose}
      release={release}
    />
  );

  return { ...view, onSelect, onClose };
};

describe('EntryReasonDrawer', () => {
  beforeEach(() => {
    mockPermissions(READ_ARTICLES);
  });

  it('shows why an entry was skipped, field by field', async () => {
    renderDrawer([details(1)]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Why this entry was skipped')).toBeInTheDocument();
    expect(within(dialog).getByText('Article 1')).toBeInTheDocument();
    expect(within(dialog).getByText('Article · Publish · en')).toBeInTheDocument();
    expect(within(dialog).getByText('Skipped: Validation error')).toBeInTheDocument();
    expect(within(dialog).getByText('2 issues')).toBeInTheDocument();

    // Each field by a readable name, its key, and what's wrong
    expect(within(dialog).getByText('Title')).toBeInTheDocument();
    expect(within(dialog).getByText('Required, or not a valid value')).toBeInTheDocument();
    expect(within(dialog).getByText('Seo › Meta title')).toBeInTheDocument();
    expect(within(dialog).getByText('seo.metaTitle')).toBeInTheDocument();
    expect(within(dialog).getByText('Too long: at most 60 characters')).toBeInTheDocument();

    expect(within(dialog).getByText(/^State captured when the release ran on/)).toBeInTheDocument();
  });

  it('lists every issue in one box, with nothing to fold', async () => {
    renderDrawer([
      details(1, {
        reason: {
          validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] },
          stage: {
            entryStage: { id: 1, name: 'In review' },
            requiredStage: { id: 2, name: 'Approved' },
          },
        },
      }),
    ]);

    const box = await screen.findByRole('region', { name: '2 issues' });
    expect(within(box).getAllByRole('listitem')).toHaveLength(2);
    expect(within(box).getByText('Title')).toBeInTheDocument();
    expect(within(box).getByText('Review stage')).toBeInTheDocument();
    expect(
      within(box).getByText('At In review, needs Approved to be published')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { expanded: true })).not.toBeInTheDocument();
  });

  it.each([
    [null, 'Not ready'],
    ['skipped_invalid', 'Skipped'],
  ] as const)("doesn't name one reason for an entry with several (%s)", async (outcome, title) => {
    renderDrawer([
      details(1, {
        outcome,
        reason: {
          validation: { errors: [{ path: ['title'], message: 'title must be defined.' }] },
          stage: {
            entryStage: { id: 1, name: 'In review' },
            requiredStage: { id: 2, name: 'Approved' },
          },
        },
      }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(title)).toBeInTheDocument();
    expect(within(dialog).getByText('2 issues')).toBeInTheDocument();
    expect(within(dialog).queryByText(/Validation error/)).not.toBeInTheDocument();
  });

  it('shows the stage a planned entry is missing', async () => {
    renderDrawer([
      details(1, {
        outcome: null,
        reason: {
          stage: {
            entryStage: { id: 1, name: 'To do' },
            requiredStage: { id: 2, name: 'Approved' },
          },
        },
      }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Why this entry isn’t ready')).toBeInTheDocument();
    expect(within(dialog).getByText('Not ready: Review stage')).toBeInTheDocument();
    expect(
      within(dialog).getByText('At To do, needs Approved to be published')
    ).toBeInTheDocument();
    // A planned entry's reasons are live: no capture date
    expect(within(dialog).queryByText(/captured/i)).not.toBeInTheDocument();
  });

  it('says an entry was never checked, rather than listing nothing', async () => {
    renderDrawer([details(1, { outcome: null, reason: null, missingReason: 'unchecked' })]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('1 issue')).toBeInTheDocument();
    expect(within(dialog).getByText('Not ready: Not checked yet')).toBeInTheDocument();
    expect(within(dialog).getByText(/hasn’t been checked yet/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Validation error/)).not.toBeInTheDocument();
  });

  it('names the error a run failed on', async () => {
    renderDrawer([
      details(1, { outcome: 'skipped_error', reason: { error: { name: 'KnexTimeoutError' } } }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Skipped: Error')).toBeInTheDocument();
    expect(within(dialog).getByText('Couldn’t be published: KnexTimeoutError')).toBeInTheDocument();
  });

  it("shows the message of an error that's meant for the user", async () => {
    renderDrawer([
      details(1, {
        outcome: 'skipped_error',
        reason: {
          error: { name: 'PartnerApiError', message: 'The séance hotline is not answering' },
        },
      }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Couldn’t be published: PartnerApiError')).toBeInTheDocument();
    expect(within(dialog).getByText('The séance hotline is not answering')).toBeInTheDocument();
  });

  it.each([
    [
      'skipped_held',
      'Waiting on other entries',
      /requires every entry to be ready.*another entry wasn’t ready or couldn’t be released/,
    ],
    ['skipped_missed', 'Server unavailable', /server was down at the scheduled time/],
  ] as const)('explains %s as its one issue', async (outcome, title, text) => {
    renderDrawer([details(1, { outcome, reason: null })]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(`Skipped: ${title}`)).toBeInTheDocument();
    const box = within(dialog).getByRole('region', { name: '1 issue' });
    expect(within(box).getByRole('listitem')).toHaveTextContent(text);
  });

  it('dates a release that ran by its run, as the page header does', async () => {
    renderDrawer([details(1)], {
      release: {
        releasedAt: '2026-09-30T09:12:00.000Z',
        scheduledAt: '2026-09-30T09:00:00.000Z',
        failureReason: null,
        timezone: 'Europe/Paris',
      },
    });

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'State captured when the release ran on Wednesday, September 30, 2026 at 11:12 (UTC+02:00).'
      )
    ).toBeInTheDocument();
  });

  it.each(['missed_schedule', 'failed_before_upgrade'] as const)(
    'dates a %s release by its schedule, not when it was marked failed',
    async (failureReason) => {
      renderDrawer([details(1, { outcome: 'skipped_missed', reason: null })], {
        release: {
          releasedAt: '2026-09-30T11:54:00.000Z',
          scheduledAt: '2026-09-30T10:53:00.000Z',
          failureReason,
          timezone: 'Europe/Paris',
        },
      });

      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByText(
          'State captured for the run scheduled on Wednesday, September 30, 2026 at 12:53 (UTC+02:00).'
        )
      ).toBeInTheDocument();
      expect(within(dialog).queryByText(/13:54/)).not.toBeInTheDocument();
    }
  );

  it('shows no date for a release that failed before the upgrade without a schedule', async () => {
    renderDrawer([details(1, { outcome: 'skipped_missed', reason: null })], {
      release: {
        releasedAt: '2026-09-30T11:54:00.000Z',
        scheduledAt: null,
        failureReason: 'failed_before_upgrade',
        timezone: null,
      },
    });

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('State captured before the release could run.')
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/captured when the release ran/i)).not.toBeInTheDocument();
  });

  it('steps through the entries with a reason', async () => {
    const { user, onSelect } = renderDrawer([details(1), details(2), details(3)], {
      selectedId: 2,
    });

    expect(await screen.findByText('2 of 3 skipped entries')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onSelect).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onSelect).toHaveBeenLastCalledWith(3);
  });

  it("can't step before the first entry or after the last", async () => {
    renderDrawer([details(1)]);

    expect(await screen.findByText('1 of 1 skipped entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('opens the entry, with its errors shown', async () => {
    renderDrawer([details(1)]);

    expect(await screen.findByRole('link', { name: 'Go to entry' })).toHaveAttribute(
      'href',
      '/content-manager/collection-types/api::article.article/doc-1?plugins%5Bi18n%5D%5Blocale%5D=en'
    );
  });

  it("doesn't offer to open a deleted entry, or one the user can't read", async () => {
    const { unmount } = renderDrawer([details(1, { isDeleted: true, entryName: 'Deleted entry' })]);

    await screen.findByRole('dialog');
    expect(screen.queryByRole('link', { name: 'Go to entry' })).not.toBeInTheDocument();
    unmount();

    mockPermissions([]);
    renderDrawer([details(1)]);

    await screen.findByRole('dialog');
    expect(screen.queryByRole('link', { name: 'Go to entry' })).not.toBeInTheDocument();
  });

  it('closes', async () => {
    const { user, onClose } = renderDrawer([details(1)]);

    const dialog = await screen.findByRole('dialog');
    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalled();
  });

  it('keeps showing an entry a refetch dropped, rather than closing', async () => {
    const onSelect = jest.fn();
    const props = { onSelect, onClose: jest.fn(), selectedId: 2, release: null };
    const { rerender, user } = render(
      <EntryReasonDrawer {...props} items={[details(1), details(2)]} />
    );

    expect(await screen.findByText('Article 2')).toBeInTheDocument();

    rerender(<EntryReasonDrawer {...props} items={[details(1)]} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
    expect(screen.queryByText(/ of /)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onSelect).toHaveBeenLastCalledWith(1);
  });

  it("doesn't show the last entry for another row the list lacks", async () => {
    const props = { onSelect: jest.fn(), onClose: jest.fn(), release: null };
    const { rerender } = render(
      <EntryReasonDrawer {...props} items={[details(1), details(2)]} selectedId={2} />
    );

    expect(await screen.findByText('Article 2')).toBeInTheDocument();

    rerender(<EntryReasonDrawer {...props} items={[details(1), details(2)]} selectedId={9} />);

    expect(screen.queryByText('Article 2')).not.toBeInTheDocument();
  });

  it('counts every entry with a reason, when only part of them is loaded', async () => {
    render(
      <EntryReasonDrawer
        items={[details(1), details(2)]}
        total={30}
        selectedId={1}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(await screen.findByText('1 of 30 skipped entries')).toBeInTheDocument();
  });

  it('loads the entries after the last one loaded, then steps into them', async () => {
    const onSelect = jest.fn();
    const onLoadMore = jest.fn();
    const props = { total: 3, selectedId: 2, onSelect, onClose: jest.fn(), onLoadMore };
    const { rerender, user } = render(
      <EntryReasonDrawer {...props} items={[details(1), details(2)]} />
    );

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    rerender(<EntryReasonDrawer {...props} items={[details(1), details(2)]} isLoadingMore />);
    // Not twice while they load
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    rerender(<EntryReasonDrawer {...props} items={[details(1), details(2), details(3)]} />);

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('lets Next try again when the entries after the last one failed to load', async () => {
    const onSelect = jest.fn();
    const onLoadMore = jest.fn();
    const props = { total: 3, selectedId: 2, onSelect, onClose: jest.fn(), onLoadMore };
    const { rerender, user } = render(
      <EntryReasonDrawer {...props} items={[details(1), details(2)]} />
    );

    await user.click(await screen.findByRole('button', { name: 'Next' }));
    rerender(<EntryReasonDrawer {...props} items={[details(1), details(2)]} isLoadingMore />);
    rerender(<EntryReasonDrawer {...props} items={[details(1), details(2)]} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onLoadMore).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("isn't open without a selected entry", () => {
    renderDrawer([details(1)], { selectedId: null as unknown as number });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
