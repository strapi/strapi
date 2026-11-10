import { fireEvent, within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { RolesPage } from '../RolesPage';

import {
  ARTICLE,
  CATEGORY,
  LAYOUT,
  PREMIUM,
  PREMIUM_WITH_PROBLEMS,
  PUBLIC,
  serveRoles,
  TAG,
  WIDE_LAYOUT,
} from './fixtures';

import type { ConditionListItem } from '../../../../../shared/contracts/conditions';
import type {
  LayoutCondition,
  PermissionLayout,
} from '../../../../../shared/contracts/permissions';
import type { RoleDetail } from '../../../../../shared/contracts/roles';

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

/** The roles page where the settings link mounts it, opened at `path` under it */
const renderRoles = (path: string) =>
  render(
    <>
      <Routes>
        <Route path="/settings/end-users/roles/*" element={<RolesPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { initialEntries: [`/settings/end-users/roles/${path}`] }
  );

const RULES = "This action's route has policies or middlewares.";
const SETTINGS_SET = 'A condition or a populate depth is set.';
const CHANGED = 'This role was changed by someone else. Reload it to see the changes.';

/** Records the body of the next `PUT` and answers `answer` */
const capturePut = (answer: () => Response) => {
  const sent: { body?: Record<string, unknown> } = {};

  server.use(
    http.put('/end-users/roles/:documentId', async ({ request }) => {
      sent.body = (await request.json()) as Record<string, unknown>;

      return answer();
    })
  );

  return sent;
};

const findHeading = (name: string) => screen.findByRole('heading', { name });

const IS_OWNER: LayoutCondition = {
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  source: 'builtin',
  params: [{ name: 'field', type: 'attribute', required: true, options: ['owner'] }],
};

/** The project of the fixtures, where Is owner applies to Article */
const LAYOUT_WITH_CONDITION: PermissionLayout = {
  ...LAYOUT,
  contentTypes: LAYOUT.contentTypes.map((type) =>
    type.uid === ARTICLE ? { ...type, conditions: [IS_OWNER] } : type
  ),
};

/** The Settings button of a content type row: Article is the first of the Collection Types tab */
const settingsButtons = () => screen.getAllByRole('button', { name: 'Settings' });

const saveButton = () => screen.getByRole('button', { name: 'Save' });

const findReview = () => screen.findByRole('dialog', { name: /^Review changes · / });

/** Saves, and confirms in the review that opens first: nothing is sent before that */
const save = async () => {
  fireEvent.click(saveButton());

  fireEvent.click(within(await findReview()).getByRole('button', { name: 'Save' }));
};

describe('EditPage', () => {
  it('says a role the server does not have is not found, with the page header', async () => {
    serveRoles();
    server.use(
      http.get('/end-users/roles/gone', () =>
        HttpResponse.json(
          { error: { status: 404, name: 'NotFoundError', message: 'Not Found' } },
          { status: 404 }
        )
      )
    );
    renderRoles('gone');

    expect(await findHeading('Role not found')).toBeInTheDocument();
    expect(
      screen.getByText("This role doesn't exist. It may have been deleted.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });

  it('shows the four tabs, the content API columns and a dot where a route has rules', async () => {
    serveRoles();
    renderRoles('p1');

    await findHeading('Edit a role');

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Collection Types',
      'Single Types',
      'Plugins',
      'Custom Routes',
    ]);

    // Find, Find one, Create, Update, Delete, and the two this plugin adds
    ['Find', 'Find one', 'Create', 'Update', 'Delete', 'Read drafts', 'Publish'].forEach(
      (action) => {
        expect(
          screen.getByRole('checkbox', { name: `Select all ${action} permissions` })
        ).toBeInTheDocument();
      }
    );

    // Article's Update route has a policy: one dot, in the cell of that action
    const dot = screen.getByRole('img', { name: RULES });
    // The dot sits in a slot of the cell, beside the checkbox: there is no role to find it by
    // eslint-disable-next-line testing-library/no-node-access
    const cell = dot.parentElement?.parentElement;

    expect(cell).toBeTruthy();
    expect(
      within(cell as HTMLElement).getByRole('checkbox', {
        name: 'Select Update Article permission',
      })
    ).toBeInTheDocument();

    // The role's own details
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('Premium member');
    expect(screen.getByRole('button', { name: '212 users with this role' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('sends only the diff with the revision on save', async () => {
    serveRoles();

    const saved = {
      ...PREMIUM,
      revision: 5,
      permissions: [
        ...PREMIUM.permissions,
        {
          documentId: 'p3',
          action: `${CATEGORY}.find`,
          subject: null,
          properties: { fields: ['name', 'slug'] },
          conditions: [],
        },
      ],
    };
    const sent = capturePut(() => HttpResponse.json({ data: saved }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await save();

    // Ticking a row grants the fields the type has now, and nothing else is in the diff
    await waitFor(() =>
      expect(sent.body).toEqual({
        revision: 4,
        name: 'Premium member',
        description: PREMIUM.description,
        requireTwoFactor: true,
        permissions: {
          create: [
            {
              action: `${CATEGORY}.find`,
              subject: null,
              properties: { fields: ['name', 'slug'] },
              conditions: [],
            },
          ],
          update: [],
          delete: [],
        },
      })
    );

    // The answer is the role as stored: the editor starts over from it, nothing left to save
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByRole('checkbox', { name: 'Select Find Category permission' })).toBeChecked();
  });

  it('creates a role with every row', async () => {
    serveRoles([PREMIUM, { ...PREMIUM, documentId: 'n1', name: 'Newsletter' }]);

    let body: Record<string, unknown> | undefined;

    server.use(
      http.post('/end-users/roles', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json(
          { data: { ...PREMIUM, documentId: 'n1', name: 'Newsletter' } },
          { status: 201 }
        );
      })
    );

    const { user } = renderRoles('new');

    await findHeading('Create a role');

    // Nothing to save without a name
    expect(saveButton()).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /^Name/ }), 'Newsletter');
    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Find one Article permission' }));
    await save();

    await waitFor(() =>
      expect(body).toEqual({
        name: 'Newsletter',
        description: null,
        requireTwoFactor: false,
        permissions: [
          {
            action: `${ARTICLE}.findOne`,
            subject: null,
            properties: { fields: ['title', 'body', 'seo.metaTitle'] },
            conditions: [],
          },
          {
            action: `${CATEGORY}.find`,
            subject: null,
            properties: { fields: ['name', 'slug'] },
            conditions: [],
          },
        ],
      })
    );

    // The new role opens in the edit page
    expect(await screen.findByText('/settings/end-users/roles/n1')).toBeInTheDocument();
    expect(await findHeading('Edit a role')).toBeInTheDocument();
  });

  it('fills a duplicate from its role, without the rows the server refuses', async () => {
    serveRoles([PREMIUM_WITH_PROBLEMS]);

    let body: Record<string, unknown> | undefined;

    server.use(
      http.post('/end-users/roles', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json({ data: { ...PREMIUM, documentId: 'c1' } }, { status: 201 });
      })
    );

    renderRoles('duplicate/p1');

    await findHeading('Duplicate a role');

    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('Premium member (copy)');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(PREMIUM.description);
    expect(screen.getByRole('checkbox', { name: 'Select Find Article permission' })).toBeChecked();
    expect(screen.queryByText(/refused by the server/)).not.toBeInTheDocument();

    // A copy is saved as it is
    await save();

    await waitFor(() =>
      expect(body).toEqual({
        name: 'Premium member (copy)',
        description: PREMIUM.description,
        requireTwoFactor: true,
        permissions: [
          {
            action: `${ARTICLE}.find`,
            subject: null,
            properties: { fields: ['title', 'body', 'seo.metaTitle'] },
            conditions: [],
          },
          { action: `${ARTICLE}.read-drafts`, subject: null, properties: {}, conditions: [] },
        ],
      })
    );
  });

  it('warns when Create is ticked without a required field', async () => {
    serveRoles();

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');
    await user.click(screen.getByRole('button', { name: 'Article' }));

    await user.click(screen.getByRole('checkbox', { name: 'Select Create Article permission' }));

    expect(screen.queryByText(/Create requests will fail/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select title Create permission' }));

    expect(await screen.findByText(/Create requests will fail/)).toBeVisible();
    // The field it names, and only that one
    expect(screen.getByText('title', { selector: 'code' })).toBeVisible();
    expect(screen.getAllByText(/is required, but this role can't set it/)).toHaveLength(1);
  });

  it('sends the conditions and the populate depth set in the Settings of a type', async () => {
    serveRoles([PREMIUM], LAYOUT_WITH_CONDITION);

    const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole('img', { name: SETTINGS_SET })).not.toBeInTheDocument();

    await user.click(settingsButtons()[0]);

    const dialog = await screen.findByRole('dialog');

    // Article has Find and Read drafts: conditions are set on those
    expect(within(dialog).getAllByRole('combobox', { name: /^Can/ })).toHaveLength(2);
    expect(within(dialog).getByRole('combobox', { name: 'Can Find When' })).toBeVisible();
    expect(within(dialog).getByRole('combobox', { name: 'Can Read drafts When' })).toBeVisible();

    await user.click(within(dialog).getByRole('combobox', { name: 'Can Find When' }));
    await user.click(await screen.findByRole('option', { name: 'Is owner' }));
    await user.keyboard('{Escape}');
    await user.click(within(dialog).getByRole('combobox', { name: 'Populate depth' }));
    await user.click(await screen.findByRole('option', { name: '2 levels' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

    // The modal is not the editor: closing it is a change of the role all the same
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(screen.getByRole('img', { name: SETTINGS_SET })).toBeInTheDocument();

    await save();

    // The condition is on Find only, the depth is written to every row of the type
    await waitFor(() =>
      expect(sent.body?.permissions).toEqual({
        create: [],
        update: [
          {
            documentId: 'p1',
            properties: { fields: ['title', 'body', 'seo.metaTitle'], populateDepth: 2 },
            conditions: [{ name: IS_OWNER.name, params: { field: 'owner' } }],
          },
          { documentId: 'p2', properties: { populateDepth: 2 } },
        ],
        delete: [],
      })
    );
  });

  it('offers conditions on the actions ticked in the editor now', async () => {
    serveRoles([PREMIUM], LAYOUT_WITH_CONDITION);

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    // Category has no row: nothing to set conditions on yet
    await user.click(settingsButtons()[1]);
    expect(await screen.findByText(/Tick an action first/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Article does: ticking Update in the editor adds its block without leaving the page
    await user.click(screen.getByRole('checkbox', { name: 'Select Update Article permission' }));
    await user.click(settingsButtons()[0]);

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getAllByRole('combobox', { name: /^Can/ })).toHaveLength(3);
    expect(within(dialog).getByRole('combobox', { name: 'Can Update When' })).toBeVisible();
  });

  it('lists refused rows and removes them on request', async () => {
    serveRoles([PREMIUM_WITH_PROBLEMS]);

    const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    // Both are named, with the reason the server gives
    expect(screen.getByText('2 permissions of this role are refused by the server')).toBeVisible();
    expect(screen.getByText(`${CATEGORY}.findOne`)).toBeVisible();
    expect(screen.getByText(/"plugin::gone.is-vip" is not a registered condition/)).toBeVisible();
    expect(screen.getByText(`${ARTICLE}.update`)).toBeVisible();
    expect(screen.getByText(new RegExp(`"gone" is not a field of ${ARTICLE}`))).toBeVisible();

    // Asking to remove them is a change of the role
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Remove them' }));

    expect(screen.getByText('They are removed when you save.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Remove them' })).not.toBeInTheDocument();

    await save();

    await waitFor(() =>
      expect(sent.body?.permissions).toEqual({ create: [], update: [], delete: ['p9', 'p10'] })
    );
  });

  it('leaves refused rows as they are when something else is saved', async () => {
    serveRoles([PREMIUM_WITH_PROBLEMS]);

    const sent = capturePut(() => HttpResponse.json({ data: PREMIUM_WITH_PROBLEMS }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await save();

    // Neither deleted nor updated: they go only when asked
    await waitFor(() =>
      expect(sent.body?.permissions).toEqual({
        create: [expect.objectContaining({ action: `${CATEGORY}.find` })],
        update: [],
        delete: [],
      })
    );
  });

  it('keeps the edits on a 409 and offers a reload', async () => {
    serveRoles();

    capturePut(() =>
      HttpResponse.json(
        {
          data: null,
          error: {
            status: 409,
            name: 'ConflictError',
            message: 'The role was changed',
            details: { code: 'ROLE_CHANGED' },
          },
        },
        { status: 409 }
      )
    );

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await save();

    expect(await screen.findByText(CHANGED)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Select Find Category permission' })).toBeChecked();

    // Someone else saved it: Reload loads what they saved, and the edits go with the old form
    server.use(
      http.get('/end-users/roles/:documentId', () =>
        HttpResponse.json({ data: { ...PREMIUM, revision: 5, name: 'Premium member, by Sam' } })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Reload' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('Premium member, by Sam')
    );
    expect(screen.queryByText(CHANGED)).not.toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select Find Category permission' })
    ).not.toBeChecked();

    // A role that has not moved on is loaded again as well: Reload is how edits are given up
    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await save();
    expect(await screen.findByText(CHANGED)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reload' }));

    await waitFor(() => expect(screen.queryByText(CHANGED)).not.toBeInTheDocument());
    expect(
      screen.getByRole('checkbox', { name: 'Select Find Category permission' })
    ).not.toBeChecked();
  });

  it.each([
    [400, 'ValidationError', 'Permission 1 (api::category.category.find): a field is not one'],
    [413, 'PayloadTooLargeError', 'Request entity too large'],
  ])('shows the message of a %i and keeps the edits', async (status, name, message) => {
    serveRoles();

    capturePut(() =>
      HttpResponse.json({ data: null, error: { status, name, message, details: {} } }, { status })
    );

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await save();

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Find Category permission' })).toBeChecked();
  });

  it('shows the routes of the content type that is open, and what the role is granted', async () => {
    serveRoles();

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    expect(screen.queryByRole('heading', { name: /^Routes bound to/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Article' }));

    expect(await screen.findByRole('heading', { name: 'Routes bound to Article' })).toBeVisible();

    const update = await screen.findByRole('group', { name: 'Update' });

    expect(within(update).getByText('Not granted')).toBeVisible();
    expect(await within(update).findByText('PUT')).toBeVisible();
    expect(within(update).getByText('Owner only')).toBeVisible();

    // The pane follows the editor, not the role as it was loaded
    await user.click(screen.getByRole('checkbox', { name: 'Select Update Article permission' }));

    expect(within(update).getByText('Granted')).toBeVisible();

    // Closing the content type closes the pane
    await user.click(screen.getByRole('button', { name: 'Article' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /^Routes bound to/ })).not.toBeInTheDocument()
    );
  });

  it('shows the routes of the open type inside its row', async () => {
    serveRoles();

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    const article = screen.getByRole('button', { name: 'Article' });
    const category = screen.getByRole('button', { name: 'Category' });

    await user.click(article);

    const heading = await findHeading('Routes bound to Article');

    // The row of the type: its own button first, then its fields and its routes, before the next type
    expect(article.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(category.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it('has no second column', async () => {
    serveRoles();

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');
    await user.click(screen.getByRole('button', { name: 'Article' }));
    await findHeading('Routes bound to Article');

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('disables Create and Update for roles, localizations and populated creator fields', async () => {
    const readOnly = { writable: false as const };
    const field = (name: string, extra = {}) => ({
      name,
      label: name,
      type: 'relation',
      required: false,
      engineOwned: false,
      ...extra,
    });

    serveRoles([PREMIUM, PUBLIC], {
      ...LAYOUT,
      contentTypes: LAYOUT.contentTypes.map((type) =>
        type.uid === ARTICLE
          ? {
              ...type,
              fields: [
                { ...field('title'), type: 'string' },
                field('roles', readOnly),
                field('localizations', readOnly),
                field('createdBy', readOnly),
              ],
            }
          : type
      ),
    });

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');
    await user.click(screen.getByRole('button', { name: 'Article' }));

    ['roles', 'localizations', 'createdBy'].forEach((name) => {
      expect(
        screen.getByRole('checkbox', { name: `Select ${name} Create permission` })
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: `Select ${name} Update permission` })
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: `Select ${name} Find permission` })
      ).toBeEnabled();
    });

    expect(screen.getByRole('checkbox', { name: 'Select title Create permission' })).toBeEnabled();
  });

  describe('a role that conditions name', () => {
    /** The checks that name Premium member, as the server answers them with the role */
    const NAMED_BY: RoleDetail['namedBy'] = [
      { name: 'plugin::end-users.members-only', displayName: 'Members only', match: 'any' },
      { name: 'plugin::end-users.not-premium', displayName: 'Not premium', match: 'none' },
    ];
    const serveNamedRole = () => serveRoles([{ ...PREMIUM, namedBy: NAMED_BY }, PUBLIC]);

    it('warns before renaming a role that conditions name, listing them', async () => {
      serveNamedRole();

      const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));
      const { user } = renderRoles('p1');

      await findHeading('Edit a role');

      await user.type(screen.getByRole('textbox', { name: /^Name/ }), ' plus');
      fireEvent.click(saveButton());

      const warning = await screen.findByRole('alertdialog');

      expect(warning).toHaveTextContent('Rename Premium member to Premium member plus?');
      // A check that lists the role stops matching it; one that excludes it stops excluding
      expect(
        within(warning).getByText(
          'Under the new name, users of this role stop matching this condition:'
        )
      ).toBeVisible();
      expect(within(warning).getByText('Members only')).toBeVisible();
      expect(
        within(warning).getByText(
          'Under the new name, users of this role are no longer excluded by this condition, so they may gain access:'
        )
      ).toBeVisible();
      expect(within(warning).getByText('Not premium')).toBeVisible();
      expect(sent.body).toBeUndefined();

      // Cancel leaves the form as it was, and sends nothing
      await user.click(within(warning).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(sent.body).toBeUndefined();

      // Confirm goes on to the review
      fireEvent.click(saveButton());
      fireEvent.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      fireEvent.click(within(await findReview()).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(sent.body?.name).toBe('Premium member plus'));
    });

    it('does not ask when the name stays', async () => {
      serveNamedRole();

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');
      await user.click(
        screen.getByRole('checkbox', { name: 'Select Find one Article permission' })
      );
      fireEvent.click(saveButton());

      expect(await findReview()).toBeVisible();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('lists every change in a review before it sends them, and sends nothing on Cancel', async () => {
    serveRoles();

    const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.type(screen.getByRole('textbox', { name: /^Name/ }), ' plus');
    await user.click(screen.getByRole('checkbox', { name: 'Select Find one Article permission' }));
    fireEvent.click(saveButton());

    const review = await screen.findByRole('dialog', {
      name: 'Review changes · Premium member plus',
    });

    expect(within(review).getByRole('region', { name: 'Role' })).toHaveTextContent(
      'Premium member → Premium member plus'
    );
    expect(within(review).getByRole('region', { name: 'Article' })).toHaveTextContent(
      'Not granted → Granted'
    );
    // Nothing else changed: no group for the other types
    expect(within(review).queryByRole('region', { name: 'Category' })).not.toBeInTheDocument();

    await user.click(within(review).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent.body).toBeUndefined();

    // The edits are still there, and the role can be saved after all
    expect(
      screen.getByRole('checkbox', { name: 'Select Find one Article permission' })
    ).toBeChecked();
    expect(saveButton()).toBeEnabled();

    await save();

    await waitFor(() => expect(sent.body?.name).toBe('Premium member plus'));
  });

  describe('a grant that makes a field a condition reads writable', () => {
    const PROFILE = 'plugin::end-users.profile';

    const profileType = (fields: string[]) => ({
      uid: PROFILE,
      label: 'Profile',
      kind: 'collectionType' as const,
      actions: ['find', 'update'].map((action) => ({
        action: action as 'find',
        actionId: `${PROFILE}.${action}`,
        hasRules: false,
      })),
      fields: fields.map((name) => ({
        name,
        label: name,
        type: 'string',
        required: false,
        engineOwned: false,
      })),
      locked: [],
      conditions: [],
    });

    const condition = (name: string, displayName: string, reads: string[]): ConditionListItem => ({
      name,
      displayName,
      subjects: [ARTICLE],
      source: 'builder',
      params: [],
      stamp: false,
      lockedFields: false,
      usedBy: 0,
      usedByRoles: [],
      editable: true,
      reads,
    });

    const WITH_PROFILE: PermissionLayout = {
      ...LAYOUT,
      contentTypes: [...LAYOUT.contentTypes, profileType(['plan', 'bio'])],
    };

    it('warns in the save review when a grant makes a field a condition reads writable', async () => {
      serveRoles([PREMIUM], WITH_PROFILE, { [ARTICLE]: [] }, [
        condition('api::pro-only', 'Pro only', ['profile.plan', 'user.name']),
        condition('api::nickname', 'Has nickname', ['profile.nickname']),
      ]);

      const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');
      await user.click(screen.getByRole('checkbox', { name: 'Select Update Profile permission' }));
      fireEvent.click(saveButton());

      const review = await findReview();

      // The condition and the field it reads, and only the ones this grant touches: `user.name`
      // is written by everyone already and `profile.nickname` is not a field of the profile
      expect(await within(review).findByText(/lets users write/)).toHaveTextContent(
        'This save lets users write profile.plan, which the condition Pro only reads.'
      );
      expect(within(review).queryByText(/Has nickname/)).not.toBeInTheDocument();
      expect(within(review).queryByText(/user\.name/)).not.toBeInTheDocument();

      // A warning, not a refusal: confirming sends the save
      fireEvent.click(within(review).getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(sent.body).toBeDefined());
    });

    it('does not warn about a grant the role already had', async () => {
      const already: RoleDetail = {
        ...PREMIUM,
        permissions: [
          ...PREMIUM.permissions,
          {
            documentId: 'p3',
            action: `${PROFILE}.update`,
            subject: null,
            properties: { fields: ['plan', 'bio'] },
            conditions: [],
          },
        ],
      };

      serveRoles([already], WITH_PROFILE, { [ARTICLE]: [] }, [
        condition('api::pro-only', 'Pro only', ['profile.plan']),
      ]);

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');
      await user.click(
        screen.getByRole('checkbox', { name: 'Select Find one Article permission' })
      );
      fireEvent.click(saveButton());

      const review = await findReview();

      expect(within(review).getByRole('region', { name: 'Article' })).toBeVisible();
      expect(within(review).queryByText(/lets users write/)).not.toBeInTheDocument();
    });
  });

  it('says there is nothing to save when a change was undone', async () => {
    serveRoles();

    const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    // The page is modified by a click and by the click that undoes it
    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Find Category permission' }));

    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());

    expect(await screen.findByText('There is nothing to save.')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sent.body).toBeUndefined();
  });

  it('shows the refused rows asked to be removed as removed', async () => {
    serveRoles([PREMIUM_WITH_PROBLEMS]);

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');
    await user.click(screen.getByRole('button', { name: 'Remove them' }));
    fireEvent.click(saveButton());

    const review = await findReview();

    // Category's Find one carried a condition that is gone, Article's Update a field that is
    expect(within(review).getByRole('region', { name: 'Category' })).toHaveTextContent(
      'Granted → Not granted'
    );
    expect(within(review).getByRole('region', { name: 'Article' })).toHaveTextContent(
      'Granted → Not granted'
    );
  });

  describe('selecting a whole column', () => {
    const columnFind = () => screen.getByRole('checkbox', { name: 'Select all Find permissions' });

    it('asks before a bulk change on three types, and saves through the review', async () => {
      serveRoles([PREMIUM], WIDE_LAYOUT);

      const sent = capturePut(() => HttpResponse.json({ data: PREMIUM }));

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');

      // Article has Find already: the column grants it on Category and Tag
      await user.click(columnFind());

      const dialog = await screen.findByRole('alertdialog');

      expect(dialog).toHaveTextContent('Grant Find on 2 more collection types?');
      expect(dialog).toHaveTextContent("You'll review every change before saving.");

      // Nothing is ticked until it is confirmed
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(
        screen.getByRole('checkbox', { name: 'Select Find Category permission' })
      ).not.toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Select Find Tag permission' })
      ).not.toBeChecked();
      expect(saveButton()).toBeDisabled();

      await user.click(columnFind());
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );

      await waitFor(() =>
        expect(screen.getByRole('checkbox', { name: 'Select Find Tag permission' })).toBeChecked()
      );
      expect(
        screen.getByRole('checkbox', { name: 'Select Find Category permission' })
      ).toBeChecked();

      // Saving lists them all, and sends them when the review is confirmed
      fireEvent.click(saveButton());

      const review = await findReview();

      expect(within(review).getByRole('region', { name: 'Category' })).toHaveTextContent(
        'Not granted → Granted'
      );
      expect(within(review).getByRole('region', { name: 'Tag' })).toHaveTextContent(
        'Not granted → Granted'
      );
      expect(within(review).queryByRole('region', { name: 'Article' })).not.toBeInTheDocument();
      expect(sent.body).toBeUndefined();

      fireEvent.click(within(review).getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(sent.body?.permissions).toEqual({
          create: [
            expect.objectContaining({ action: `${CATEGORY}.find` }),
            expect.objectContaining({ action: `${TAG}.find` }),
          ],
          update: [],
          delete: [],
        })
      );
    });

    it('asks to remove it as well, and says when a search limits it', async () => {
      serveRoles([PREMIUM], WIDE_LAYOUT);

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');

      // Every type has Find; the search lists the three of them
      await user.click(columnFind());
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
      );
      await waitFor(() =>
        expect(screen.getByRole('checkbox', { name: 'Select Find Tag permission' })).toBeChecked()
      );

      await user.click(screen.getByRole('button', { name: 'Search content types and fields' }));
      await user.type(screen.getByRole('searchbox'), 'a');
      await user.click(columnFind());

      expect(await screen.findByRole('alertdialog')).toHaveTextContent(
        'Remove Find from 3 collection types matching your search?'
      );
    });

    it('applies at once to fewer than three types', async () => {
      serveRoles();

      const { user } = renderRoles('p1');

      await findHeading('Edit a role');

      // Article and Category: two types
      await user.click(screen.getByRole('checkbox', { name: 'Select all Find one permissions' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Select Find one Category permission' })
      ).toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Select Find one Article permission' })
      ).toBeChecked();
    });
  });

  it('exports the role as the file an import reads', async () => {
    serveRoles();

    const file = {
      version: 1,
      role: { name: 'Premium member', description: null, type: 'custom', requireTwoFactor: true },
      permissions: [{ action: `${ARTICLE}.find`, subject: null, properties: {}, conditions: [] }],
    };

    server.use(http.get('/end-users/roles/:documentId/export', () => HttpResponse.json(file)));

    // jsdom saves nothing: what the page hands to the browser is what is looked at
    const createObjectURL = jest.fn((_blob: Blob) => 'blob:role');
    const fileNames: string[] = [];
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function saveName(this: HTMLAnchorElement) {
        fileNames.push(this.download);
      });

    Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });

    try {
      const { user } = renderRoles('p1');

      await findHeading('Edit a role');
      await user.click(screen.getByRole('button', { name: 'Export' }));

      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));

      expect(fileNames).toEqual(['premium-member.role.json']);

      const written = await new Promise<string>((resolve) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(createObjectURL.mock.calls[0][0]);
      });

      expect(JSON.parse(written)).toEqual(file);
    } finally {
      click.mockRestore();
    }
  });

  it('disables two-factor on Public', async () => {
    serveRoles();

    renderRoles('public');

    await findHeading('Edit a role');

    expect(screen.getByRole('checkbox', { name: /Require two-factor/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Require two-factor/ })).not.toBeChecked();
    expect(screen.getByText('Public has no signed-in users.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'No signed-in users' })).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    serveRoles();

    const { user } = renderRoles('p1');

    await findHeading('Edit a role');

    await user.type(screen.getByRole('textbox', { name: /^Name/ }), ' (old)');

    // The mobile back link is hidden on a desktop screen, which a test does not have
    await user.click(screen.getByRole('link', { name: 'Back', hidden: true }));

    const dialog = await screen.findByRole('alertdialog');

    expect(
      within(dialog).getByText('You have unsaved changes, are you sure you want to leave?')
    ).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/settings/end-users/roles/p1');

    await user.click(screen.getByRole('link', { name: 'Back', hidden: true }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' })
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/settings\/end-users\/roles$/)
    );
  });

  it('renders 30 content types with their field matrices closed', async () => {
    // The light check: what keeps the editor fast is that a closed row costs a row
    const types = Array.from({ length: 30 }, (_, position) => {
      const uid = `api::type${position + 1}.type${position + 1}`;

      return {
        uid,
        label: `Type ${position + 1}`,
        kind: 'collectionType' as const,
        actions: ['find', 'findOne', 'create', 'update', 'delete'].map((action) => ({
          action: action as 'find',
          actionId: `${uid}.${action}`,
          hasRules: false,
        })),
        fields: ['headline', 'summary'].map((name) => ({
          name,
          label: name,
          type: 'string',
          required: false,
          engineOwned: false,
        })),
        locked: [],
        conditions: [],
      };
    });
    const layout: PermissionLayout = { contentTypes: types, groups: [] };

    serveRoles([PUBLIC], layout);

    renderRoles('public');

    await findHeading('Edit a role');

    // Text and label queries: a role query over this many rows takes seconds
    expect(screen.getAllByText(/^Type \d+$/)).toHaveLength(30);
    expect(screen.queryAllByLabelText('Select headline Find permission')).toHaveLength(0);

    fireEvent.click(screen.getByText('Type 7'));

    expect(screen.getAllByLabelText('Select headline Find permission')).toHaveLength(1);
  });
});
