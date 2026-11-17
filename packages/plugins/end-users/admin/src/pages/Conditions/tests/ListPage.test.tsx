import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { PERMISSIONS } from '../../../constants';
import { ListPage } from '../ListPage';

import { listItem } from './fixtures';

/** The test providers always run as in development: the cases that need otherwise set this. */
let mockAutoReload = true;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAppInfo: (_consumer: string, selector: (state: { autoReload: boolean }) => unknown) =>
    selector({ autoReload: mockAutoReload }),
}));

const CONDITIONS = [
  listItem({
    name: 'is-owner',
    displayName: 'Is owner',
    subjects: ['api::article.article', 'api::comment.comment'],
    source: 'builtin',
    usedBy: 3,
  }),
  listItem({
    name: 'api::is-published',
    displayName: 'Is published',
    subjects: ['api::article.article'],
    source: 'code',
    usedBy: 1,
  }),
  listItem({
    name: 'plugin::shop.is-buyer',
    displayName: 'Is buyer',
    subjects: [],
    source: 'plugin',
  }),
  listItem({
    name: 'api::mine',
    displayName: 'Mine',
    subjects: ['api::article.article', 'api::comment.comment', 'api::page.page', 'api::post.post'],
    source: 'builder',
    usedBy: 2,
  }),
];

/** The notice's text up to the `strapi develop` that is set apart in its own element */
const DEVELOPMENT_ONLY = /^Conditions can be created and changed only while Strapi runs with/;

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

/** The page is mounted where the settings link mounts it, so its relative links land under it. */
const tree = (
  <>
    <Routes>
      <Route path="/settings/end-users/conditions/*" element={<ListPage />} />
    </Routes>
    <LocationDisplay />
  </>
);

const renderListPage = () => render(tree, { initialEntries: ['/settings/end-users/conditions'] });

describe('ListPage', () => {
  beforeEach(() => {
    mockAutoReload = true;

    server.use(
      http.get('/end-users/conditions', () => HttpResponse.json({ data: CONDITIONS })),
      http.get('/end-users/permissions/layout', () =>
        HttpResponse.json({
          data: {
            contentTypes: [
              { uid: 'api::article.article', label: 'Article' },
              { uid: 'api::comment.comment', label: 'Comment' },
              { uid: 'api::page.page', label: 'Page' },
              { uid: 'api::post.post', label: 'Post' },
            ],
            groups: [],
          },
        })
      )
    );
  });

  it('lists conditions with source and use', async () => {
    renderListPage();

    expect(await screen.findByRole('heading', { name: 'Conditions' })).toBeInTheDocument();

    // The Design System table gives header and body cells the same role
    const [header, ...rows] = screen.getAllByRole('row');
    const textOfCells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('gridcell')
        .slice(0, 4)
        .map((cell) => cell.textContent);

    expect(textOfCells(header)).toEqual(['Name', 'Content types', 'Source', 'Used by']);
    expect(rows.map(textOfCells)).toEqual([
      ['Is owner', 'Article, Comment', 'Built-in', '3 roles'],
      ['Is published', 'Article', 'Code', '1 role'],
      ['Is buyer', 'None', 'Plugin', '0 roles'],
      ['Mine', 'Article, Comment and 2 more', 'Builder', '2 roles'],
    ]);
  });

  it('offers Add new condition in development only', async () => {
    const { unmount } = renderListPage();

    const link = await screen.findByRole('link', { name: 'Add new condition' });

    expect(link).toHaveAttribute('href', '/settings/end-users/conditions/new');
    expect(screen.queryByText(DEVELOPMENT_ONLY)).not.toBeInTheDocument();

    unmount();
    mockAutoReload = false;
    renderListPage();

    await screen.findByRole('heading', { name: 'Conditions' });

    expect(screen.queryByRole('link', { name: 'Add new condition' })).not.toBeInTheDocument();
    expect(screen.getByText(DEVELOPMENT_ONLY)).toHaveTextContent(
      'Conditions can be created and changed only while Strapi runs with strapi develop.'
    );
  });

  it('offers no Add new condition to an admin who may only read conditions', async () => {
    renderAdmin(tree, {
      initialEntries: ['/settings/end-users/conditions'],
      providerOptions: { permissions: PERMISSIONS.conditions.read },
    });

    await screen.findByRole('heading', { name: 'Conditions' });

    expect(screen.queryByRole('link', { name: 'Add new condition' })).not.toBeInTheDocument();
    // Development, so the notice about `strapi develop` would be wrong
    expect(screen.queryByText(DEVELOPMENT_ONLY)).not.toBeInTheDocument();
    // The builder still opens, read-only, to see what a condition does
    expect(screen.getByRole('link', { name: 'Read Mine' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit Mine' })).not.toBeInTheDocument();
  });

  it('opens a builder condition in the builder, as editable in development and read-only outside it', async () => {
    const { user, unmount } = renderListPage();

    // A link on every row
    expect(await screen.findAllByRole('link', { name: /^(Edit|Read) / })).toHaveLength(4);

    await user.click(screen.getByRole('link', { name: 'Edit Mine' }));

    expect(await screen.findByText('/settings/end-users/conditions/mine')).toBeInTheDocument();

    unmount();
    mockAutoReload = false;
    renderListPage();

    expect(await screen.findByRole('link', { name: 'Read Mine' })).toHaveAttribute(
      'href',
      '/settings/end-users/conditions/mine'
    );
    expect(screen.queryByRole('link', { name: 'Edit Mine' })).not.toBeInTheDocument();
  });

  it('opens every other condition on its read-only page, named as the condition is', async () => {
    const { user } = renderListPage();

    // Never "Edit": there is no builder for them, in development or not
    expect(await screen.findByRole('link', { name: 'Read Is owner' })).toHaveAttribute(
      'href',
      '/settings/end-users/conditions/view/is-owner'
    );
    expect(screen.getByRole('link', { name: 'Read Is published' })).toHaveAttribute(
      'href',
      '/settings/end-users/conditions/view/api%3A%3Ais-published'
    );
    expect(screen.getByRole('link', { name: 'Read Is buyer' })).toHaveAttribute(
      'href',
      '/settings/end-users/conditions/view/plugin%3A%3Ashop.is-buyer'
    );
    expect(screen.queryByRole('link', { name: /^Edit (?!Mine)/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Read Is buyer' }));

    expect(
      await screen.findByText('/settings/end-users/conditions/view/plugin%3A%3Ashop.is-buyer')
    ).toBeInTheDocument();
  });

  it('opens a builder condition from its row, and any other from its row to its read-only page', async () => {
    const { user, unmount } = renderListPage();

    await user.click(await screen.findByText('Mine'));

    expect(await screen.findByText('/settings/end-users/conditions/mine')).toBeInTheDocument();

    unmount();
    const { user: next } = renderListPage();

    await next.click(await screen.findByText('Is published'));

    expect(
      await screen.findByText('/settings/end-users/conditions/view/api%3A%3Ais-published')
    ).toBeInTheDocument();
  });

  it('opens a condition the builder wrote but cannot address on its read-only page', async () => {
    // A hand-written `.json` file whose name is not `api::<slug>`: the builder has no slug for it
    server.use(
      http.get('/end-users/conditions', () =>
        HttpResponse.json({
          data: [
            listItem({
              name: 'shop::legacy',
              displayName: 'Legacy',
              subjects: [],
              source: 'builder',
            }),
          ],
        })
      )
    );

    const { user } = renderListPage();

    await user.click(await screen.findByRole('link', { name: 'Read Legacy' }));

    expect(
      await screen.findByText('/settings/end-users/conditions/view/shop%3A%3Alegacy')
    ).toBeInTheDocument();
  });

  it('shows the error page when the list cannot be read', async () => {
    server.use(
      http.get('/end-users/conditions', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'ApplicationError', message: 'Boom', details: {} } },
          { status: 500 }
        )
      )
    );

    renderListPage();

    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('shows the stale banner and badge', async () => {
    server.use(
      http.get('/end-users/conditions', () =>
        HttpResponse.json({
          data: [
            ...CONDITIONS,
            listItem({
              name: 'api::gone',
              displayName: 'Gone',
              subjects: [],
              source: 'builder',
              stale: ['api::missing.missing'],
            }),
          ],
        })
      )
    );

    renderListPage();

    expect(
      await screen.findByText(
        "1 condition refers to content types or fields that no longer exist. They deny everything until they're fixed."
      )
    ).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);

    expect(within(rows[rows.length - 1]).getByText('Needs fixing')).toBeInTheDocument();
    expect(screen.getAllByText('Needs fixing')).toHaveLength(1);
  });

  it('shows no stale banner when every condition is sound', async () => {
    renderListPage();

    await screen.findByRole('heading', { name: 'Conditions' });

    expect(screen.queryByText(/no longer exist/)).not.toBeInTheDocument();
    expect(screen.queryByText('Needs fixing')).not.toBeInTheDocument();
  });
});
