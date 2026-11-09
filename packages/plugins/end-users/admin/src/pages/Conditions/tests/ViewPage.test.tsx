import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { PERMISSIONS } from '../../../constants';
import { ConditionsPage } from '../ConditionsPage';

import { ARTICLE, COMMENT, LAYOUT, USER, listItem } from './fixtures';

/**
 * The conditions page also holds the builder, which takes the restart overlay from
 * `@strapi/strapi/admin`: that loads the whole admin, the Media Library's cropper included, whose
 * stylesheet is mocked here as the builder's own tests do.
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});

const IS_OWNER = listItem({
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  subjects: [ARTICLE, COMMENT],
  source: 'builtin',
  params: [
    { name: 'field', type: 'attribute', required: false, relationTarget: USER },
    { name: 'setOnCreate', type: 'boolean', required: false, default: true },
  ],
  stamp: true,
  lockedFields: true,
  usedBy: 2,
  usedByRoles: [
    { documentId: 'role-1', name: 'Members' },
    { documentId: 'role-2', name: 'Premium' },
  ],
});

const IS_SELF = listItem({
  name: 'plugin::end-users.is-self',
  displayName: 'Is self',
  subjects: [USER],
  source: 'builtin',
  lockedFields: true,
  query: { documentId: { $eq: '$user.documentId' } },
});

const PUBLISHED_SOON = listItem({
  name: 'api::published-soon',
  displayName: 'Published soon',
  // Every content type of the layout
  subjects: [ARTICLE, COMMENT, USER],
  source: 'code',
  query: {
    $and: [{ title: { $startsWith: 'A' } }, { views: { $gte: 3 } }],
    owner: { documentId: { $eq: '$user.documentId' } },
  },
});

const EITHER = listItem({
  name: 'api::either',
  displayName: 'Either',
  subjects: [ARTICLE],
  source: 'code',
  query: { $or: [{ title: { $eq: 'x' } }, { title: { $eq: 'y' } }] },
});

const TIERED = listItem({
  name: 'plugin::shop.tiered',
  displayName: 'Tiered',
  subjects: [ARTICLE],
  source: 'plugin',
  params: [{ name: 'tier', type: 'string', required: true }],
  query: { tier: { $eq: '$params.tier' } },
});

const COMPUTED = listItem({
  name: 'api::computed',
  displayName: 'Computed',
  subjects: ['api::gone.gone'],
  source: 'code',
});

const BUILDER_CONDITION = listItem({
  name: 'api::team-only',
  displayName: 'Team only',
  subjects: [ARTICLE],
  source: 'builder',
  builder: {
    version: 2,
    slug: 'team-only',
    displayName: 'Team only',
    appliesTo: { kind: 'types', types: [ARTICLE] },
    inputs: [
      { name: 'minViews', kind: 'number', required: true, default: 3 },
      { name: 'ownerField', kind: 'field', accepts: { relation: USER }, required: false },
    ],
    who: {
      match: 'all',
      checks: [
        { kind: 'roles', match: 'any', roles: ['Editors'] },
        { kind: 'email-verified', value: true },
      ],
    },
    which: {
      kind: 'group',
      match: 'all',
      items: [
        {
          kind: 'check',
          target: { path: ['views'] },
          operator: '$gte',
          value: { kind: 'input', name: 'minViews' },
        },
        {
          kind: 'group',
          match: 'any',
          items: [
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'fixed', value: 'x' },
            },
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'fixed', value: 'y' },
            },
          ],
        },
      ],
    },
    onSave: { stamp: [{ field: 'owner', value: { kind: 'user' } }], locked: ['owner'] },
  },
});

const LIST_PATH = '/settings/end-users/conditions';

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

const tree = (
  <>
    <Routes>
      <Route path="/settings/end-users/conditions/*" element={<ConditionsPage />} />
    </Routes>
    <LocationDisplay />
  </>
);

const viewPath = (name: string) => `${LIST_PATH}/view/${encodeURIComponent(name)}`;

const renderView = (name: string) => render(tree, { initialEntries: [viewPath(name)] });

beforeEach(() => {
  server.use(
    http.get('/end-users/permissions/layout', () => HttpResponse.json({ data: LAYOUT })),
    http.get('/end-users/conditions/builder-layout', () =>
      HttpResponse.json({
        data: { contentTypes: [], userAttributes: [], profileAttributes: [], roles: [] },
      })
    ),
    http.get('/end-users/conditions', () =>
      HttpResponse.json({
        data: [IS_OWNER, IS_SELF, PUBLISHED_SOON, EITHER, TIERED, COMPUTED, BUILDER_CONDITION],
      })
    )
  );
});

/** The section with this heading: each is a labeled region */
const section = async (name: string) => within(await screen.findByRole('region', { name }));

describe('ViewPage', () => {
  it('shows what a built-in condition is, takes, does and is used by', async () => {
    renderView(IS_OWNER.name);

    expect(await screen.findByRole('heading', { name: 'Is owner', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("It is built into the end-users plugin, so it can't be changed.")
    ).toBeInTheDocument();

    // About: the name, source and content types, and a paragraph of what the code does
    const about = await section('About');

    expect(about.getByText(/The entry's owner is the signed-in end user/)).toBeInTheDocument();
    expect(about.getByText('plugin::end-users.is-owner')).toBeInTheDocument();
    expect(about.getByText('Built-in')).toBeInTheDocument();
    expect(about.getByText('Article')).toBeInTheDocument();
    expect(about.getByText('Comment')).toBeInTheDocument();
    expect(about.queryByText('Every content type')).not.toBeInTheDocument();

    // A function is computed when it runs
    expect((await section('Where')).getByText('Computed in code when it runs')).toBeInTheDocument();

    // The declared params, one row each
    const params = await section('Parameters');
    const rows = params.getAllByRole('row').map((row) =>
      within(row)
        .getAllByRole('gridcell')
        .map((cell) => cell.textContent)
    );

    expect(rows).toEqual([
      ['Name', 'Type', 'Required', 'Default', 'Relation to'],
      ['field', 'attribute', 'No', '—', 'End user'],
      ['setOnCreate', 'boolean', 'No', 'true', '—'],
    ]);

    const writes = await section('When entries are written');

    expect(writes.getByText('Sets fields when an entry is created')).toBeInTheDocument();
    expect(writes.getByText("Some fields can't change on update")).toBeInTheDocument();

    // The roles that use it, each a link to its editor
    const users = await section('Used by');

    expect(users.getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      '/settings/end-users/roles/role-1'
    );
    expect(users.getByRole('link', { name: 'Premium' })).toHaveAttribute(
      'href',
      '/settings/end-users/roles/role-2'
    );

    // Nothing to save or delete
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('describes the built-in that is the signed-in user, and draws its query as a chip', async () => {
    renderView(IS_SELF.name);

    expect(await screen.findByRole('heading', { name: 'Is self', level: 1 })).toBeInTheDocument();
    expect(
      (await section('About')).getByText(/The entry is the signed-in end user's own account/)
    ).toBeInTheDocument();
    expect(
      (await section('Where')).getByText("documentId $eq the signed-in user's ID")
    ).toBeInTheDocument();
    expect(screen.queryByText('Computed in code when it runs')).not.toBeInTheDocument();

    // It declares no params and stamps nothing, but locks fields
    expect(
      (await section('Parameters')).getByText('This condition takes no parameters.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Sets fields when an entry is created')).not.toBeInTheDocument();
    expect(screen.getByText("Some fields can't change on update")).toBeInTheDocument();
    expect(
      (await section('Used by')).getByText('No role uses this condition yet.')
    ).toBeInTheDocument();
  });

  it('says every content type for a condition that leaves none out, and draws each row of its query', async () => {
    renderView(PUBLISHED_SOON.name);

    expect(
      await screen.findByRole('heading', { name: 'Published soon', level: 1 })
    ).toBeInTheDocument();

    const about = await section('About');

    expect(about.getByText('Every content type')).toBeInTheDocument();
    expect(about.getByText('Code')).toBeInTheDocument();
    // A code condition's own paragraph is not the plugin's
    expect(about.queryByText(/signed-in end user/)).not.toBeInTheDocument();

    const where = await section('Where');

    expect(where.getByText('title $startsWith A')).toBeInTheDocument();
    expect(where.getByText('views $gte 3')).toBeInTheDocument();
    expect(where.getByText('owner $eq the signed-in user')).toBeInTheDocument();
    expect(where.getByText('An entry is kept when every row is true.')).toBeInTheDocument();
  });

  it('shows a query that is not a list of rows as it is written', async () => {
    renderView(EITHER.name);

    const where = await section('Where');

    expect(
      await where.findByText(/more than rows that are all true, so it is shown as it is written/)
    ).toBeInTheDocument();
    expect(where.getByText(/"\$or": \[/)).toBeInTheDocument();
    expect(where.queryByText('Computed in code when it runs')).not.toBeInTheDocument();
  });

  it('shows the params of a plugin condition, the value they fill, and where to change it', async () => {
    renderView(TIERED.name);

    expect(await screen.findByRole('heading', { name: 'Tiered', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText('A plugin registers it: change it in that plugin.')
    ).toBeInTheDocument();
    expect((await section('About')).getByText('Plugin')).toBeInTheDocument();
    expect((await section('Where')).getByText('tier $eq the tier param')).toBeInTheDocument();

    const [, row] = (await section('Parameters')).getAllByRole('row');

    expect(
      within(row)
        .getAllByRole('gridcell')
        .map((cell) => cell.textContent)
    ).toEqual(['tier', 'string', 'Yes', '—', '—']);
  });

  it('names a content type the layout lacks by its uid, and says where a code condition is changed', async () => {
    renderView(COMPUTED.name);

    expect(await screen.findByRole('heading', { name: 'Computed', level: 1 })).toBeInTheDocument();
    expect((await section('About')).getByText('api::gone.gone')).toBeInTheDocument();
    expect(
      screen.getByText(/It is written in your project's code, in .* change it there\./)
    ).toBeInTheDocument();
  });

  it('lists the roles without links for an admin who may not read roles', async () => {
    renderAdmin(tree, {
      initialEntries: [viewPath(IS_OWNER.name)],
      providerOptions: { permissions: PERMISSIONS.conditions.read },
    });

    const users = await section('Used by');

    expect(users.getByText('Members')).toBeInTheDocument();
    expect(users.getByText('Premium')).toBeInTheDocument();
    expect(users.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no content for a name no condition has, `new` included', async () => {
    const { unmount } = renderView('api::nobody');

    expect(await screen.findByText(/No content found/)).toBeInTheDocument();

    unmount();
    renderView('new');

    expect(await screen.findByText(/No content found/)).toBeInTheDocument();
  });

  it('says a condition that lost a content type or field denies everything, on that condition only', async () => {
    server.use(
      http.get('/end-users/conditions', () =>
        HttpResponse.json({
          data: [{ ...BUILDER_CONDITION, stale: ['api::gone.gone'] }, EITHER],
        })
      )
    );

    const { unmount } = renderView(BUILDER_CONDITION.name);

    expect(
      await screen.findByText(
        "1 condition refers to content types or fields that no longer exist. They deny everything until they're fixed."
      )
    ).toBeInTheDocument();

    unmount();
    renderView(EITHER.name);

    expect(await screen.findByRole('heading', { name: 'Either', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/no longer exist/)).not.toBeInTheDocument();
  });

  it('names the values a condition reads that users can change themselves, and under which roles', async () => {
    server.use(
      http.get('/end-users/conditions', () =>
        HttpResponse.json({
          data: [
            {
              ...BUILDER_CONDITION,
              selfWritable: [
                { field: 'profile.plan', roles: ['Authenticated', 'Members'] },
                { field: 'user.name', roles: ['every signed-in user'] },
              ],
            },
          ],
        })
      )
    );

    renderView(BUILDER_CONDITION.name);

    const alert = await screen.findByText('Users can change these values themselves:');

    expect(alert).toBeInTheDocument();
    expect(screen.getByText('profile.plan (Authenticated, Members)')).toBeInTheDocument();
    expect(screen.getByText('user.name (every signed-in user)')).toBeInTheDocument();
  });

  it('shows no such alert for a condition users cannot influence', async () => {
    renderView(BUILDER_CONDITION.name);

    expect(await screen.findByRole('heading', { name: 'Team only', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Users can change these values themselves:')).not.toBeInTheDocument();
  });

  it('shows a builder condition read-only with its summary and parts', async () => {
    renderView(BUILDER_CONDITION.name);

    expect(await screen.findByRole('heading', { name: 'Team only', level: 1 })).toBeInTheDocument();

    expect(
      (await section('Summary')).getByText(
        /^Keeps entries where views is at least the minViews input/
      )
    ).toBeInTheDocument();

    const inputs = await section('Inputs');
    const rows = inputs.getAllByRole('row').map((row) =>
      within(row)
        .getAllByRole('gridcell')
        .map((cell) => cell.textContent)
    );

    expect(rows).toEqual([
      ['Name', 'Type', 'Accepts', 'Required', 'Default'],
      ['minViews', 'number', '—', 'Yes', '3'],
      ['ownerField', 'field', `relation to ${USER}`, 'No', '—'],
    ]);

    const who = await section('Who checks');

    expect(who.getByText('Holds any of the roles Editors')).toBeInTheDocument();
    expect(who.getByText('Has a verified email')).toBeInTheDocument();

    const which = await section('Which entries');

    expect(which.getByText('All of these are true')).toBeInTheDocument();
    expect(which.getByText('views is at least the minViews input')).toBeInTheDocument();
    expect(which.getByText('Any of these is true')).toBeInTheDocument();
    expect(which.getByText("title is 'x'")).toBeInTheDocument();

    const writes = await section('When entries are written');

    expect(writes.getByText('On create: owner is set to the signed-in user')).toBeInTheDocument();
    expect(writes.getByText("Can't change on update: owner")).toBeInTheDocument();

    // A builder condition has no query to draw
    expect(screen.queryByRole('region', { name: 'Where' })).not.toBeInTheDocument();
  });
});
