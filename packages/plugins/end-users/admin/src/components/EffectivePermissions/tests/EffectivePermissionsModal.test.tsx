import { within } from '@testing-library/react';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ARTICLE, CATEGORY, LAYOUT, PREMIUM } from '../../../pages/Roles/tests/fixtures';
import { EffectivePermissionsModal } from '../EffectivePermissionsModal';

import type { ConditionListItem } from '../../../../../shared/contracts/conditions';
import type { RoleDetail } from '../../../../../shared/contracts/roles';
import type { EffectivePermissions } from '../../../../../shared/contracts/user-security';

const PRO_ONLY: ConditionListItem = {
  name: 'api::pro-only',
  displayName: 'Pro only',
  subjects: [ARTICLE],
  source: 'builder',
  params: [],
  stamp: false,
  lockedFields: false,
  usedBy: 1,
  usedByRoles: [],
  editable: true,
  builder: {
    version: 2,
    slug: 'pro-only',
    displayName: 'Pro only',
    appliesTo: { kind: 'types', types: [ARTICLE] },
    inputs: [],
    who: {
      match: 'all',
      checks: [
        {
          kind: 'attribute',
          source: 'profile',
          attribute: 'plan',
          operator: '$eq',
          value: { kind: 'fixed', value: 'pro' },
        },
      ],
    },
    which: { kind: 'group', match: 'all', items: [] },
    onSave: { stamp: [], locked: [] },
  },
};

const IS_OWNER: ConditionListItem = {
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  subjects: [ARTICLE],
  source: 'builtin',
  params: [],
  stamp: false,
  lockedFields: false,
  usedBy: 0,
  usedByRoles: [],
  editable: false,
};

/** A second role that grants Category: Premium grants Article */
const CATEGORY_READER: RoleDetail = {
  ...PREMIUM,
  documentId: 'c1',
  name: 'Category reader',
  permissions: [
    {
      documentId: 'c-1',
      action: `${CATEGORY}.find`,
      subject: null,
      properties: { fields: ['name'] },
      conditions: [],
    },
  ],
};

const EFFECTIVE: EffectivePermissions = {
  roles: [
    { documentId: 'p1', name: 'Premium member', type: 'custom' },
    { documentId: 'c1', name: 'Category reader', type: 'custom' },
  ],
  routes: [],
  subjects: {
    [ARTICLE]: {
      find: {
        fields: ['title', 'body'],
        conditions: [PRO_ONLY.name, IS_OWNER.name],
        populateDepth: 2,
      },
      'read-drafts': { fields: null, conditions: [], populateDepth: null },
    },
    [CATEGORY]: { find: { fields: ['name'], conditions: [], populateDepth: null } },
  },
};

const serve = (effective: EffectivePermissions = EFFECTIVE) => {
  const roles = [PREMIUM, CATEGORY_READER];

  server.use(
    http.get('/end-users/users/u1/effective-permissions', () =>
      HttpResponse.json({ data: effective })
    ),
    http.get('/end-users/permissions/layout', () => HttpResponse.json({ data: LAYOUT })),
    http.get('/end-users/conditions', () => HttpResponse.json({ data: [PRO_ONLY, IS_OWNER] })),
    http.get('/end-users/conditions/builder-layout', () =>
      HttpResponse.json({
        data: { contentTypes: [], userAttributes: [], profileAttributes: [], roles: [] },
      })
    ),
    http.get('/end-users/roles/:documentId', ({ params }) =>
      HttpResponse.json({ data: roles.find(({ documentId }) => documentId === params.documentId) })
    )
  );
};

const renderModal = (props: Partial<React.ComponentProps<typeof EffectivePermissionsModal>> = {}) =>
  render(<EffectivePermissionsModal documentId="u1" open onClose={jest.fn()} {...props} />);

describe('EffectivePermissionsModal', () => {
  it('groups permissions by type and names the role each comes from', async () => {
    serve();
    renderModal();

    const article = await screen.findByRole('region', { name: 'Article' });
    const category = screen.getByRole('region', { name: 'Category' });

    // One row per action the user holds on the type, with the role it comes from (read per role,
    // so it appears once the roles are loaded)
    const find = within(article).getByRole('row', { name: /Find/ });

    expect(within(find).getByText('title, body')).toBeVisible();
    expect(within(find).getByText('2')).toBeVisible();
    expect(await within(find).findByText('Premium member')).toBeVisible();
    expect(within(article).queryByText('Category reader')).not.toBeInTheDocument();

    const readDrafts = within(article).getByRole('row', { name: /Read drafts/ });

    expect(within(readDrafts).getByText('Every field')).toBeVisible();
    expect(within(readDrafts).getByText('Unlimited')).toBeVisible();

    // The other role grants the other type
    expect(await within(category).findByText('Category reader')).toBeVisible();
    expect(within(category).queryByText('Premium member')).not.toBeInTheDocument();
  });

  it('quotes a builder condition through summarize', async () => {
    serve();
    renderModal();

    const article = await screen.findByRole('region', { name: 'Article' });

    expect(await within(article).findByText('Pro only')).toBeVisible();
    // The sentence summarize writes for the condition's Who check
    expect(
      await within(article).findByText(/Only for users who have a profile with plan is 'pro'/)
    ).toBeVisible();
    // A condition of code or the plugin is named, not quoted
    expect(within(article).getByText('Is owner')).toBeVisible();
  });

  it('reads nothing while it is closed', async () => {
    let asked = false;

    serve();
    server.use(
      http.get('/end-users/users/u1/effective-permissions', () => {
        asked = true;

        return HttpResponse.json({ data: EFFECTIVE });
      })
    );

    renderModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });
});
