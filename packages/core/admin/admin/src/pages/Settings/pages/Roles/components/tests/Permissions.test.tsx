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
