import React from 'react';

import { render, screen } from '@tests/utils';

import { capitalise } from '../../../../../../utils/strings';
import { Permissions, type PermissionsAPI } from '../Permissions';

import layout from './test-data.json';

import type { Permission as AuthPermission } from '../../../../../../features/Auth';

const COLUMN_HEADERS = ['Create', 'Read', 'Update', 'Delete', 'Publish'];

const COLLECTION_TYPES = layout.sections.collectionTypes.subjects.map(
  (subject) => subject.uid.split('.')[1]
);

const ADDRESS_FIELDS: string[] =
  layout.sections.collectionTypes.subjects[0].properties[0].children.map((child) => child.label);

describe('Permissions', () => {
  it('should render correctly with no user interaction', async () => {
    render(<Permissions layout={layout} />);

    expect(screen.getByRole('tablist', { name: 'Tabs Permissions' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Collection Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Single Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plugins' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();

    expect(screen.getByRole('tabpanel', { name: 'Collection Types' })).toBeInTheDocument();

    COLUMN_HEADERS.forEach((head) =>
      expect(
        screen.getByRole('checkbox', { name: `Select all ${head} permissions` })
      ).toBeInTheDocument()
    );

    COLLECTION_TYPES.forEach((type) =>
      expect(
        screen.getByRole('checkbox', { name: `Select all ${capitalise(type)} permissions` })
      ).toBeInTheDocument()
    );

    COLLECTION_TYPES.forEach((type) =>
      COLUMN_HEADERS.forEach((head) => {
        if (type === 'address' && head === 'Publish') {
          return;
        }

        expect(
          screen.getByRole('checkbox', { name: `Select ${head} ${type} permission` })
        ).toBeInTheDocument();
      })
    );

    COLLECTION_TYPES.forEach((type) =>
      expect(screen.getByRole('button', { name: capitalise(type) })).toBeInTheDocument()
    );
  });

  it("should render the a content-type's subject accordion panel when selected", async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('button', { name: capitalise(COLLECTION_TYPES[0]) }));

    ADDRESS_FIELDS.forEach((field) => {
      expect(
        screen.getByRole('checkbox', { name: `Select all ${field} permissions` })
      ).toBeInTheDocument();

      COLUMN_HEADERS.filter((head) => head !== 'Publish' && head !== 'Delete').forEach((head) => {
        expect(
          screen.getByRole('checkbox', { name: `Select ${field} ${head} permission` })
        ).toBeInTheDocument();
      });
    });

    await user.click(screen.getByRole('button', { name: 'repeat_req_min' }));

    COLUMN_HEADERS.filter((head) => head !== 'Publish' && head !== 'Delete').forEach((head) => {
      expect(
        screen.getByRole('checkbox', { name: `Select repeat_req_min name ${head} permission` })
      ).toBeInTheDocument();
    });
  });

  it("should not render anything in the plugins tab because it's empty", async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('tab', { name: 'Plugins' }));

    expect(await screen.findByRole('tabpanel', { name: 'Plugins' })).toBeInTheDocument();

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('should render the settings tab as expected', async () => {
    const { user } = render(<Permissions layout={layout} />);

    await user.click(screen.getByRole('tab', { name: 'Settings' }));

    expect(await screen.findByRole('tabpanel', { name: 'Settings' })).toBeInTheDocument();

    [
      'Email email settings',
      'Media library media library settings',
      'Internationalization Internationalization settings',
    ].forEach((setting) => {
      expect(screen.getByRole('button', { name: setting })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Email email settings' }));

    expect(await screen.findByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();

    expect(
      screen.getByRole('checkbox', { name: 'Access the Email Settings page' })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Minimal i18n layout fixture for getPermissions() tests
// ---------------------------------------------------------------------------

const READ_ACTION = 'plugin::content-manager.explorer.read';
const ARTICLE_UID = 'api::article.article';

const i18nLayout = {
  conditions: [],
  sections: {
    collectionTypes: {
      subjects: [
        {
          uid: ARTICLE_UID,
          label: 'Article',
          properties: [
            {
              value: 'fields',
              label: 'Fields',
              children: [{ value: 'title', label: 'title' }],
            },
            {
              value: 'locales',
              label: 'Locales',
              children: [
                { value: 'en', label: 'English', isDefault: true },
                { value: 'fr', label: 'French' },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          actionId: READ_ACTION,
          label: 'Read',
          applyToProperties: ['fields', 'locales'],
          subjects: [ARTICLE_UID],
        },
      ],
    },
    singleTypes: { subjects: [], actions: [] },
    plugins: { subjects: [] },
    settings: { subjects: [] },
  },
} as unknown as React.ComponentProps<typeof Permissions>['layout'];

const makePermission = (locales: string[] | null) => ({
  id: 1,
  createdAt: '',
  updatedAt: '',
  action: READ_ACTION,
  actionParameters: {},
  subject: ARTICLE_UID,
  properties: { fields: ['title'], locales },
  conditions: [],
});

const findArticleReadPermission = (
  permissionsToSend: ReturnType<PermissionsAPI['getPermissions']>['permissionsToSend']
) => permissionsToSend.find((p) => p.action === READ_ACTION && p.subject === ARTICLE_UID);

describe('getPermissions() — null locale restoration', () => {
  it('preserves locales: null when the user has not changed locale selections', async () => {
    const ref = React.createRef<PermissionsAPI>();

    render(<Permissions layout={i18nLayout} permissions={[makePermission(null)]} ref={ref} />);

    const { permissionsToSend } = ref.current!.getPermissions();
    const perm = findArticleReadPermission(permissionsToSend);

    expect(perm?.properties?.locales).toBeNull();
  });

  it('sends an explicit locale list when the user changes locale selections', async () => {
    const ref = React.createRef<PermissionsAPI>();

    const { user } = render(
      <Permissions layout={i18nLayout} permissions={[makePermission(null)]} ref={ref} />
    );

    await user.click(screen.getByRole('button', { name: 'Article' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select fr Read permission' }));

    const { permissionsToSend } = ref.current!.getPermissions();
    const perm = findArticleReadPermission(permissionsToSend);

    expect(perm?.properties?.locales).toEqual(['en']);
  });

  it('does not coerce explicit locale selections back to null', async () => {
    const ref = React.createRef<PermissionsAPI>();

    render(<Permissions layout={i18nLayout} permissions={[makePermission(['fr'])]} ref={ref} />);

    const { permissionsToSend } = ref.current!.getPermissions();
    const perm = findArticleReadPermission(permissionsToSend);

    expect(perm?.properties?.locales).toEqual(['fr']);
  });
});

describe('hasLocaleValidationErrors() — ref API', () => {
  it('returns false when every enabled action has at least one locale selected', async () => {
    const ref = React.createRef<PermissionsAPI>();

    render(<Permissions layout={i18nLayout} permissions={[makePermission(['en'])]} ref={ref} />);

    expect(ref.current!.hasLocaleValidationErrors()).toBe(false);
  });

  it('returns true when an enabled action has no locale selected', async () => {
    const ref = React.createRef<PermissionsAPI>();

    const { user } = render(
      <Permissions layout={i18nLayout} permissions={[makePermission(['en', 'fr'])]} ref={ref} />
    );

    await user.click(screen.getByRole('button', { name: 'Article' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select en Read permission' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select fr Read permission' }));

    expect(ref.current!.hasLocaleValidationErrors()).toBe(true);
  });
});

/**
 * Regression test for CMS-627.
 *
 * On the Create/Edit Admin Token screen the permission matrix is rendered with
 * `userPermissions` so selections are restricted to what the token owner is
 * allowed to grant. In that mode the per-subcategory "Select all" checkbox for
 * plugins/settings did nothing: plugin/setting permissions are stored with
 * `subject: null` and their real action id is the full `plugin::` leaf segment,
 * but the parent-checkbox reducer treated the category as the subject and the UI
 * subcategory as the action, so the owner-permission lookup never matched and
 * every leaf was filtered out.
 *
 * "Select all" must now select the subcategory actions the owner holds, while
 * still leaving out any action the owner does not have.
 */
describe('Permissions — "Select all" in Admin Token mode (userPermissions provided)', () => {
  const settingPermission = (action: string): AuthPermission => ({
    action,
    subject: null,
    properties: {},
    conditions: [],
  });

  it('selects the owner-granted actions of a settings subcategory and skips the rest', async () => {
    // Owner holds Create/Read/Update for i18n locales, but NOT Delete.
    const userPermissions: AuthPermission[] = [
      settingPermission('plugin::i18n.locale.create'),
      settingPermission('plugin::i18n.locale.read'),
      settingPermission('plugin::i18n.locale.update'),
    ];

    const { user } = render(
      <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
    );

    // Go to the Settings tab and open the Internationalization category.
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: /Internationalization/ }));

    const create = screen.getByLabelText('Create');
    const read = screen.getByLabelText('Read');
    const update = screen.getByLabelText('Update');
    const del = screen.getByLabelText('Delete');

    // The granted actions are enabled; the ungranted one is disabled.
    expect(create).not.toBeChecked();
    expect(del).toBeDisabled();

    // Click the subcategory "Select all".
    await user.click(screen.getByLabelText('Select all'));

    // Owner-granted actions get selected; the ungranted "Delete" stays unchecked.
    expect(create).toBeChecked();
    expect(read).toBeChecked();
    expect(update).toBeChecked();
    expect(del).not.toBeChecked();
  });
});

/**
 * On the role Create/Edit pages the matrix is rendered with the current user's
 * `userPermissions` (unless they are a super admin) so that an admin cannot grant a
 * permission they do not hold themselves. Unlike admin tokens, conditions are not
 * inherited from the user and the conditions modal stays editable.
 */
describe('Permissions — role editing with userPermissions (non super admin)', () => {
  const UNHELD_TOOLTIP = "You can't grant a permission you don't have yourself";
  const INHERITED_NOTICE =
    'These conditions are inherited from your permissions and are read-only.';

  const permission = (
    action: string,
    subject: string | null = null,
    properties: AuthPermission['properties'] = {},
    conditions: string[] = []
  ): AuthPermission => ({ action, subject, properties, conditions });

  const openI18nLocales = async (user: ReturnType<typeof render>['user']) => {
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: /Internationalization/ }));
  };

  it('disables the checkboxes of permissions the user does not hold and explains why', async () => {
    const userPermissions = [
      permission('plugin::content-manager.explorer.read', 'api::address.address'),
    ];

    const { user } = render(
      <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
    );

    const readAddress = screen.getByRole('checkbox', { name: 'Select Read address permission' });
    const createAddress = screen.getByRole('checkbox', {
      name: 'Select Create address permission',
    });

    expect(readAddress).toBeEnabled();
    expect(createAddress).toBeDisabled();

    await user.hover(createAddress);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(UNHELD_TOOLTIP);
  });

  it('keeps a permission the role already holds checked, disabled and sent on save', async () => {
    const ref = React.createRef<PermissionsAPI>();
    const userPermissions = [
      permission('plugin::i18n.locale.create'),
      permission('plugin::i18n.locale.read'),
    ];
    const rolePermissions = [
      {
        id: 1,
        createdAt: '',
        updatedAt: '',
        action: 'plugin::i18n.locale.delete',
        actionParameters: {},
        subject: null,
        properties: {},
        conditions: [],
      },
    ];

    const { user } = render(
      <Permissions
        ref={ref}
        layout={layout}
        permissions={rolePermissions}
        userPermissions={userPermissions}
        isFormDisabled={false}
      />
    );

    await openI18nLocales(user);

    const del = screen.getByLabelText('Delete');

    expect(del).toBeChecked();
    expect(del).toBeDisabled();

    // "Select all" only ticks what the user holds and leaves the existing permission as is
    await user.click(screen.getByLabelText('Select all'));

    expect(screen.getByLabelText('Create')).toBeChecked();
    expect(screen.getByLabelText('Read')).toBeChecked();
    expect(screen.getByLabelText('Update')).not.toBeChecked();
    expect(del).toBeChecked();

    expect(ref.current!.getPermissions().permissionsToSend).toEqual(
      expect.arrayContaining([
        { action: 'plugin::i18n.locale.delete', subject: null, conditions: [], properties: {} },
        { action: 'plugin::i18n.locale.create', subject: null, conditions: [], properties: {} },
      ])
    );
  });

  it('does not let a property row checkbox tick an action the user does not hold', async () => {
    const userPermissions = [
      permission('plugin::content-manager.explorer.read', 'api::category.category', {
        fields: ['name'],
        locales: ['en'],
      }),
    ];

    const { user } = render(
      <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
    );

    await user.click(screen.getByRole('button', { name: 'Category' }));

    await user.click(screen.getByRole('checkbox', { name: 'Select all name permissions' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select all English (en) permissions' }));

    expect(screen.getByRole('checkbox', { name: 'Select name Read permission' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select en Read permission' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Select name Create permission' })
    ).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select en Create permission' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select en Delete permission' })).not.toBeChecked();
  });

  it('disables the locales the user does not hold and skips them when ticking the action', async () => {
    const ref = React.createRef<PermissionsAPI>();
    const layoutWithFrench: typeof layout = JSON.parse(JSON.stringify(layout));
    layoutWithFrench.sections.collectionTypes.subjects[1].properties[1].children.push({
      label: 'French (fr)',
      value: 'fr',
    });
    const userPermissions = [
      permission('plugin::content-manager.explorer.read', 'api::category.category', {
        fields: ['name'],
        locales: ['en'],
      }),
    ];

    const { user } = render(
      <Permissions
        ref={ref}
        layout={layoutWithFrench}
        userPermissions={userPermissions}
        isFormDisabled={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Category' }));

    const readEn = screen.getByRole('checkbox', { name: 'Select en Read permission' });
    const readFr = screen.getByRole('checkbox', { name: 'Select fr Read permission' });

    expect(readEn).toBeEnabled();
    expect(readFr).toBeDisabled();

    await user.hover(readFr);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(UNHELD_TOOLTIP);

    await user.click(screen.getByRole('checkbox', { name: 'Select Read category permission' }));

    expect(readEn).toBeChecked();
    expect(readFr).not.toBeChecked();

    const sent = ref
      .current!.getPermissions()
      .permissionsToSend.find(
        (perm) =>
          perm.action === 'plugin::content-manager.explorer.read' &&
          perm.subject === 'api::category.category'
      );

    expect(sent?.properties).toEqual({ fields: ['name'], locales: ['en'] });
  });

  it('keeps the conditions modal editable', async () => {
    const userPermissions = [permission('plugin::i18n.locale.create')];

    const { user } = render(
      <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
    );

    await openI18nLocales(user);
    await user.click(screen.getByLabelText('Create'));
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.queryByText(INHERITED_NOTICE)).not.toBeInTheDocument();
  });

  it('makes the conditions modal read-only only when conditions are inherited (admin tokens)', async () => {
    const userPermissions = [permission('plugin::i18n.locale.create')];

    const { user } = render(
      <Permissions
        layout={layout}
        userPermissions={userPermissions}
        inheritConditions
        isFormDisabled={false}
      />
    );

    await openI18nLocales(user);
    await user.click(screen.getByLabelText('Create'));
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(INHERITED_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  describe('conditions', () => {
    const IS_CREATOR = 'admin::is-creator';
    const SAME_ROLE = 'admin::has-same-role-as-creator';
    const LOCALE_CREATE = 'plugin::i18n.locale.create';
    const LOCALE_READ = 'plugin::i18n.locale.read';

    const findSent = (ref: React.RefObject<PermissionsAPI>, action: string, subject = null) =>
      ref
        .current!.getPermissions()
        .permissionsToSend.find((perm) => perm.action === action && perm.subject === subject);

    const openConditionOptions = async (user: ReturnType<typeof render>['user']) => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('dialog');
      await user.click(screen.getByRole('combobox'));
    };

    it('fills in the user conditions when ticking a permission they only hold with conditions', async () => {
      const ref = React.createRef<PermissionsAPI>();
      const userPermissions = [
        permission(LOCALE_CREATE, null, {}, [IS_CREATOR]),
        permission(LOCALE_CREATE, null, {}, [SAME_ROLE]),
        permission(LOCALE_READ, null, {}, [IS_CREATOR]),
        permission(LOCALE_READ),
      ];

      const { user } = render(
        <Permissions
          ref={ref}
          layout={layout}
          userPermissions={userPermissions}
          isFormDisabled={false}
        />
      );

      await openI18nLocales(user);
      await user.click(screen.getByLabelText('Create'));
      await user.click(screen.getByLabelText('Read'));

      expect(findSent(ref, LOCALE_CREATE)?.conditions).toEqual(
        expect.arrayContaining([IS_CREATOR, SAME_ROLE])
      );
      expect(findSent(ref, LOCALE_CREATE)?.conditions).toHaveLength(2);
      // One of the user's read permissions is unconditional, so no condition is needed
      expect(findSent(ref, LOCALE_READ)?.conditions).toEqual([]);
    });

    it('fills in the user conditions when ticking a content type action', async () => {
      const ref = React.createRef<PermissionsAPI>();
      const userPermissions = [
        permission('plugin::content-manager.explorer.read', 'api::address.address', {}, [
          IS_CREATOR,
        ]),
      ];

      const { user } = render(
        <Permissions
          ref={ref}
          layout={layout}
          userPermissions={userPermissions}
          isFormDisabled={false}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: 'Select Read address permission' }));

      const sent = ref
        .current!.getPermissions()
        .permissionsToSend.find(
          (perm) =>
            perm.action === 'plugin::content-manager.explorer.read' &&
            perm.subject === 'api::address.address'
        );

      expect(sent?.conditions).toEqual([IS_CREATOR]);
    });

    it('only lets the user select conditions they hold', async () => {
      const userPermissions = [permission(LOCALE_CREATE, null, {}, [IS_CREATOR, SAME_ROLE])];
      const otherUserPermissions = [permission(LOCALE_CREATE, null, {}, [IS_CREATOR])];

      const { user, unmount } = render(
        <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
      );

      await openI18nLocales(user);
      await user.click(screen.getByLabelText('Create'));
      await openConditionOptions(user);

      expect(screen.getByRole('option', { name: 'Has same role as creator' })).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );

      unmount();

      const { user: otherUser } = render(
        <Permissions
          layout={layout}
          userPermissions={otherUserPermissions}
          isFormDisabled={false}
        />
      );

      await openI18nLocales(otherUser);
      await otherUser.click(screen.getByLabelText('Create'));
      await openConditionOptions(otherUser);

      expect(screen.getByRole('option', { name: 'Has same role as creator' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('locks the conditions of a permission carrying a condition the user does not hold', async () => {
      const ref = React.createRef<PermissionsAPI>();
      const userPermissions = [permission(LOCALE_CREATE, null, {}, [IS_CREATOR])];
      const rolePermissions = [
        {
          id: 1,
          createdAt: '',
          updatedAt: '',
          action: LOCALE_CREATE,
          actionParameters: {},
          subject: null,
          properties: {},
          conditions: [SAME_ROLE],
        },
      ];

      const { user } = render(
        <Permissions
          ref={ref}
          layout={layout}
          permissions={rolePermissions}
          userPermissions={userPermissions}
          isFormDisabled={false}
        />
      );

      await openI18nLocales(user);
      await openConditionOptions(user);

      const isCreator = screen.getByRole('option', { name: 'Is creator' });
      const sameRole = screen.getByRole('option', { name: 'Has same role as creator' });

      // Adding a held condition would broaden a permission the user does not hold
      expect(isCreator).toHaveAttribute('aria-disabled', 'true');
      expect(isCreator).not.toBeChecked();
      expect(sameRole).toHaveAttribute('aria-disabled', 'true');
      expect(sameRole).toBeChecked();

      await user.click(isCreator);
      await user.keyboard('[Escape]');
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      expect(findSent(ref, LOCALE_CREATE)?.conditions).toEqual([SAME_ROLE]);
    });

    it('does not let the user remove the last condition they hold', async () => {
      const userPermissions = [permission(LOCALE_CREATE, null, {}, [IS_CREATOR])];

      const { user } = render(
        <Permissions layout={layout} userPermissions={userPermissions} isFormDisabled={false} />
      );

      await openI18nLocales(user);
      await user.click(screen.getByLabelText('Create'));
      await openConditionOptions(user);

      const isCreator = screen.getByRole('option', { name: 'Is creator' });

      expect(isCreator).toBeChecked();
      expect(isCreator).toHaveAttribute('aria-disabled', 'true');
    });

    it('leaves conditions empty and every condition selectable for super admins', async () => {
      const ref = React.createRef<PermissionsAPI>();

      const { user } = render(<Permissions ref={ref} layout={layout} isFormDisabled={false} />);

      await openI18nLocales(user);
      await user.click(screen.getByLabelText('Create'));

      expect(findSent(ref, LOCALE_CREATE)?.conditions).toEqual([]);

      await openConditionOptions(user);

      expect(screen.getByRole('option', { name: 'Is creator' })).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByRole('option', { name: 'Has same role as creator' })).not.toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('still copies the user conditions for admin tokens', async () => {
      const ref = React.createRef<PermissionsAPI>();
      const userPermissions = [
        permission(LOCALE_CREATE, null, {}, [IS_CREATOR]),
        permission(LOCALE_READ),
      ];

      const { user } = render(
        <Permissions
          ref={ref}
          layout={layout}
          userPermissions={userPermissions}
          inheritConditions
          isFormDisabled={false}
        />
      );

      await openI18nLocales(user);
      await user.click(screen.getByLabelText('Create'));
      await user.click(screen.getByLabelText('Read'));

      expect(findSent(ref, LOCALE_CREATE)?.conditions).toEqual([IS_CREATOR]);
      expect(findSent(ref, LOCALE_READ)?.conditions).toEqual([]);
    });
  });
});
