import { useAuth } from '@strapi/admin/strapi-admin';
import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { EntryReasonDrawer, type EntryReasonDetails } from '../EntryReasonDrawer';

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

const renderDrawer = (
  items: EntryReasonDetails[],
  { selectedId = items[0].id, releasedAt = '2026-09-30T09:00:00.000Z' } = {}
) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const view = render(
    <EntryReasonDrawer
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      onClose={onClose}
      releasedAt={releasedAt}
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

    expect(within(dialog).getByText(/^Captured when the release ran on/)).toBeInTheDocument();
  });

  it('folds a section of issues away', async () => {
    const { user } = renderDrawer([details(1)]);

    const toggle = await screen.findByRole('button', { name: /^Fields/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
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
    expect(within(dialog).getByText(/^Checked when the entry was last saved/)).toBeInTheDocument();
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

  it.each([
    ['skipped_held', 'Waiting on other entries', /requires every entry to be ready/],
    ['skipped_missed', 'Server unavailable', /server was down at the scheduled time/],
  ] as const)('explains %s in a sentence, with no issues to list', async (outcome, title, text) => {
    renderDrawer([details(1, { outcome, reason: null })]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(`Skipped: ${title}`)).toBeInTheDocument();
    expect(within(dialog).getByText(text)).toBeInTheDocument();
    expect(within(dialog).queryByText(/issues?$/)).not.toBeInTheDocument();
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
    const props = { onSelect, onClose: jest.fn(), selectedId: 2, releasedAt: null };
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
    const props = { onSelect: jest.fn(), onClose: jest.fn(), releasedAt: null };
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
