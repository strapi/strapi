import * as React from 'react';

import { within } from '@testing-library/react';
import { act, fireEvent, render, screen, waitFor } from '@tests/utils';

import { Permissions, type PermissionsAPI, type PermissionsLayout } from '../Permissions';

import layout from './test-data.json';

const ADDRESS = 'api::address.address';
const CATEGORY = 'api::category.category';
const READ = 'plugin::content-manager.explorer.read';

const settingsLayout = {
  ...layout,
  sections: {
    ...layout.sections,
    plugins: [
      {
        action: 'plugin::myplugin.read',
        displayName: 'Access my plugin',
        plugin: 'plugin::myplugin',
        subCategory: 'general',
      },
    ],
  },
} as unknown as PermissionsLayout;

const legacyLocalesLayout = {
  conditions: [],
  sections: {
    collectionTypes: {
      subjects: [
        {
          uid: ADDRESS,
          label: 'Address',
          properties: [
            {
              value: 'fields',
              label: 'Fields',
              children: [
                { value: 'city', label: 'city' },
                { value: 'street', label: 'street' },
              ],
            },
            {
              value: 'locales',
              label: 'Locales',
              children: [{ value: 'en', label: 'English', isDefault: true }],
            },
          ],
        },
      ],
      actions: [
        {
          actionId: READ,
          label: 'Read',
          applyToProperties: ['fields', 'locales'],
          subjects: [ADDRESS],
        },
      ],
    },
    singleTypes: { subjects: [], actions: [] },
    plugins: [],
    settings: [],
  },
} as unknown as PermissionsLayout;

const CREATE = 'plugin::content-manager.explorer.create';

/**
 * One content type with a field rule of every kind: a required field, an engine-owned field the
 * Create action cannot set, and a locked row.
 */
const fieldRulesLayout = (
  fields: Array<Record<string, unknown>> = [
    { value: 'city', label: 'city', required: true },
    { value: 'street', label: 'street' },
    { value: 'emailVerified', label: 'emailVerified', disabledActions: [CREATE] },
  ]
) =>
  ({
    conditions: [],
    sections: {
      collectionTypes: {
        subjects: [
          {
            uid: ADDRESS,
            label: 'Address',
            locked: [{ label: 'password', note: 'Hidden from responses' }],
            properties: [{ value: 'fields', label: 'Fields', children: fields }],
          },
        ],
        actions: [
          { actionId: READ, label: 'Read', applyToProperties: ['fields'], subjects: [ADDRESS] },
          {
            actionId: CREATE,
            label: 'Create',
            applyToProperties: ['fields'],
            subjects: [ADDRESS],
          },
        ],
      },
      singleTypes: { subjects: [], actions: [] },
      plugins: [],
      settings: [],
    },
  }) as unknown as PermissionsLayout;

const storedRow = (action: string, properties: Record<string, unknown>) => ({
  id: 1,
  createdAt: '',
  updatedAt: '',
  action,
  actionParameters: {},
  subject: ADDRESS,
  properties,
  conditions: [],
});

const cell = (field: string, action: string) =>
  screen.getByRole('checkbox', { name: `Select ${field} ${action} permission` });

const openAddress = (user: ReturnType<typeof render>['user']) =>
  user.click(screen.getByRole('button', { name: 'Address' }));

const tickReadOnAddress = (user: ReturnType<typeof render>['user']) =>
  user.click(screen.getByRole('checkbox', { name: 'Select Read address permission' }));

const RESTAURANT = 'api::restaurant.restaurant';

type SearchKind = 'content-types' | 'plugins' | 'settings';

const searchLabel = (kind: SearchKind) =>
  ({
    'content-types': 'Search content types and fields',
    plugins: 'Search plugins and actions',
    settings: 'Search settings and actions',
  })[kind];

/**
 * Three content types to search: `address` (with a group `seo` that holds `title` and
 * `description`), `category` and `restaurant`; and two plugins, one with two actions.
 */
const searchLayout = {
  conditions: [],
  sections: {
    collectionTypes: {
      subjects: [
        {
          uid: ADDRESS,
          label: 'address',
          properties: [
            {
              value: 'fields',
              label: 'Fields',
              children: [
                { value: 'city', label: 'city' },
                { value: 'street', label: 'street' },
                {
                  value: 'seo',
                  label: 'seo',
                  children: [
                    { value: 'title', label: 'title' },
                    { value: 'description', label: 'description' },
                  ],
                },
              ],
            },
          ],
        },
        {
          uid: CATEGORY,
          label: 'category',
          properties: [
            { value: 'fields', label: 'Fields', children: [{ value: 'name', label: 'name' }] },
          ],
        },
        {
          uid: RESTAURANT,
          label: 'restaurant',
          properties: [
            {
              value: 'fields',
              label: 'Fields',
              children: [{ value: 'cuisine', label: 'cuisine' }],
            },
          ],
        },
      ],
      actions: [
        {
          actionId: READ,
          label: 'Read',
          applyToProperties: ['fields'],
          subjects: [ADDRESS, CATEGORY, RESTAURANT],
        },
        {
          actionId: CREATE,
          label: 'Create',
          applyToProperties: ['fields'],
          subjects: [ADDRESS, CATEGORY, RESTAURANT],
        },
        {
          actionId: 'plugin::content-manager.explorer.publish',
          label: 'Publish',
          applyToProperties: ['fields'],
          subjects: [ADDRESS],
        },
      ],
    },
    singleTypes: {
      subjects: [
        {
          uid: 'api::homepage.homepage',
          label: 'homepage',
          properties: [
            { value: 'fields', label: 'Fields', children: [{ value: 'title', label: 'title' }] },
          ],
        },
      ],
      actions: [
        {
          actionId: READ,
          label: 'Read',
          applyToProperties: ['fields'],
          subjects: ['api::homepage.homepage'],
        },
      ],
    },
    plugins: [
      {
        action: 'plugin::myplugin.read',
        displayName: 'Access my plugin',
        plugin: 'plugin::myplugin',
        subCategory: 'general',
      },
      {
        action: 'plugin::myplugin.edit',
        displayName: 'Edit the thing',
        plugin: 'plugin::myplugin',
        subCategory: 'general',
      },
      {
        action: 'plugin::other.read',
        displayName: 'Look at other',
        plugin: 'plugin::other',
        subCategory: 'general',
      },
    ],
    settings: [],
  },
} as unknown as PermissionsLayout;

/**
 * `alpha` matches `alpha` by its label alone, `beta` and `gamma` by a field each.
 */
const labelFirstLayout = {
  conditions: [],
  sections: {
    collectionTypes: {
      subjects: ['alpha', 'beta', 'gamma'].map((name) => ({
        uid: `api::${name}.${name}`,
        label: name,
        properties: [
          {
            value: 'fields',
            label: 'Fields',
            children: [
              {
                value: name === 'alpha' ? 'x' : `alpha-${name}`,
                label: name === 'alpha' ? 'x' : `alpha-${name}`,
              },
            ],
          },
        ],
      })),
      actions: [
        {
          actionId: READ,
          label: 'Read',
          applyToProperties: ['fields'],
          subjects: ['api::alpha.alpha', 'api::beta.beta', 'api::gamma.gamma'],
        },
      ],
    },
    singleTypes: { subjects: [], actions: [] },
    plugins: [],
    settings: [],
  },
} as unknown as PermissionsLayout;

const openSearch = async (
  user: ReturnType<typeof render>['user'],
  kind: SearchKind = 'content-types'
) => {
  await user.click(screen.getByRole('button', { name: searchLabel(kind) }));

  return screen.getByRole('searchbox', { name: searchLabel(kind) });
};

const searchFor = async (
  user: ReturnType<typeof render>['user'],
  text: string,
  kind: SearchKind = 'content-types'
) => {
  await user.type(await openSearch(user, kind), text);
};

const columnReadCheckbox = () =>
  screen.getByRole('checkbox', { name: 'Select all Read permissions' });

describe('Permissions options', () => {
  describe('tabLabels', () => {
    it('relabels one tab and hides another', () => {
      render(
        <Permissions
          layout={layout}
          tabLabels={{ settings: { id: 't', defaultMessage: 'Custom routes' }, plugins: null }}
        />
      );

      expect(screen.getByRole('tab', { name: 'Custom routes' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Settings' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Plugins' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Collection Types' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Single Types' })).toBeInTheDocument();
    });

    it('opens the first tab that is left when the first one is hidden', () => {
      render(<Permissions layout={layout} tabLabels={{ collectionTypes: null }} />);

      expect(screen.queryByRole('tab', { name: 'Collection Types' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Single Types' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByRole('tabpanel', { name: 'Single Types' })).toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('reports each change with the rows it would send', async () => {
      const onChange = jest.fn();
      const ref = React.createRef<PermissionsAPI>();
      const { user } = render(<Permissions ref={ref} layout={layout} onChange={onChange} />);

      // Reading the form is not a change
      expect(onChange).not.toHaveBeenCalled();

      await tickReadOnAddress(user);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: READ, subject: ADDRESS, conditions: [] }),
        ])
      );
      expect(onChange).toHaveBeenLastCalledWith(ref.current!.getPermissions().permissionsToSend);

      await tickReadOnAddress(user);

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('reports the rows with the locales the role keeps as `null`', async () => {
      const onChange = jest.fn();
      const permissions = [
        {
          id: 1,
          createdAt: '',
          updatedAt: '',
          action: READ,
          actionParameters: {},
          subject: ADDRESS,
          properties: { fields: ['city'], locales: null },
          conditions: [],
        },
      ];
      const { user } = render(
        <Permissions layout={legacyLocalesLayout} permissions={permissions} onChange={onChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Address' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select all street permissions' }));

      // `null` means every locale: the locales are not sent as the list the form expanded them to
      expect(onChange).toHaveBeenLastCalledWith([
        {
          action: READ,
          subject: ADDRESS,
          conditions: [],
          properties: { fields: ['city', 'street'], locales: null },
        },
      ]);
    });

    it('calls the latest callback without reporting a change when it is replaced', async () => {
      const first = jest.fn();
      const second = jest.fn();
      const { user, rerender } = render(<Permissions layout={layout} onChange={first} />);

      rerender(<Permissions layout={layout} onChange={second} />);

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();

      await tickReadOnAddress(user);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('reports the form being reset', async () => {
      const onChange = jest.fn();
      const ref = React.createRef<PermissionsAPI>();
      const { user } = render(<Permissions ref={ref} layout={layout} onChange={onChange} />);

      await tickReadOnAddress(user);
      ref.current!.resetForm();

      await screen.findByRole('checkbox', { name: 'Select Read address permission' });

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('onOpenSubjectChange', () => {
    it('reports the content type that is open', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={layout} onOpenSubjectChange={onOpenSubjectChange} />
      );

      expect(onOpenSubjectChange).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Address' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({ tab: 'collectionTypes', id: ADDRESS });

      await user.click(screen.getByRole('button', { name: 'Category' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'collectionTypes',
        id: CATEGORY,
      });

      await user.click(screen.getByRole('button', { name: 'Category' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith(null);
    });

    it('reports nothing is open any more when the tab with the open content type is left', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={layout} onOpenSubjectChange={onOpenSubjectChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Address' }));
      await user.click(screen.getByRole('tab', { name: 'Single Types' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith(null);
    });

    it('reports the plugin or category that is open, with its tab', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={settingsLayout} onOpenSubjectChange={onOpenSubjectChange} />
      );

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await user.click(screen.getByRole('button', { name: 'Myplugin myplugin plugin' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'plugins',
        id: 'plugin::myplugin',
      });

      await user.click(screen.getByRole('button', { name: 'Myplugin myplugin plugin' }));

      expect(onOpenSubjectChange).toHaveBeenLastCalledWith(null);
    });
  });

  describe('renderSubjectActions', () => {
    it('renders subject actions in each content type row, and no conditions button without conditions', async () => {
      const renderSubjectActions = jest.fn(({ subject }: { subject: string }) => (
        <button type="button">Settings {subject}</button>
      ));

      render(
        <Permissions
          layout={{ ...layout, conditions: [] }}
          renderSubjectActions={renderSubjectActions}
        />
      );

      expect(screen.getByRole('button', { name: `Settings ${ADDRESS}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Settings ${CATEGORY}` })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Settings api::/ })).toHaveLength(2);
      expect(renderSubjectActions).toHaveBeenCalledWith({
        tab: 'collectionTypes',
        subject: ADDRESS,
        disabled: false,
      });

      // The conditions buttons are only shown when a row is hovered or open, hence `hidden`
      expect(screen.queryAllByRole('button', { name: 'Settings', hidden: true })).toHaveLength(0);
    });

    it('tells the action when the form is disabled', () => {
      const renderSubjectActions = jest.fn(() => null);

      render(
        <Permissions layout={layout} isFormDisabled renderSubjectActions={renderSubjectActions} />
      );

      expect(renderSubjectActions).toHaveBeenCalledWith(
        expect.objectContaining({ subject: ADDRESS, disabled: true })
      );
    });

    it('keeps the conditions button of each content type next to its subject action when there are conditions', () => {
      render(
        <Permissions
          layout={layout}
          renderSubjectActions={({ subject }) => <button type="button">Settings {subject}</button>}
        />
      );

      expect(screen.getAllByRole('button', { name: 'Settings', hidden: true })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /^Settings api::/ })).toHaveLength(2);
    });
  });
  describe('renderSubjectDetails', () => {
    it('renders inside the open content type only, and in a plugin category when that opens', async () => {
      const { user } = render(
        <Permissions
          layout={settingsLayout}
          renderSubjectDetails={({ tab, subject }) => <p>Details {`${tab} ${subject}`}</p>}
        />
      );

      expect(screen.queryByText(/^Details /)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Address' }));

      expect(screen.getByText(`Details collectionTypes ${ADDRESS}`)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Address' }));

      expect(screen.queryByText(/^Details /)).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await user.click(screen.getByRole('button', { name: 'Myplugin myplugin plugin' }));

      expect(screen.getByText('Details plugins plugin::myplugin')).toBeInTheDocument();
    });
  });

  describe('trailing cell', () => {
    it('reserves a trailing cell for the conditions button when the prop is set', () => {
      render(
        <Permissions
          layout={layout}
          renderSubjectActions={({ subject }) => <button type="button">Settings {subject}</button>}
        />
      );

      expect(screen.getAllByTestId('subject-actions-cell')).toHaveLength(2);
    });

    it('sizes the row to its cells so the trailing cell is inside it', () => {
      render(
        <Permissions
          layout={layout}
          renderSubjectActions={({ subject }) => <button type="button">Settings {subject}</button>}
        />
      );

      // cell > row wrapper > the box the buttons are positioned in
      const box = screen.getAllByTestId('subject-actions-cell')[0].parentElement?.parentElement;

      // jsdom drops `max-content` from computed styles, so the rule is read from the stylesheet
      const css = Array.from(document.querySelectorAll('style'))
        .map((style) => style.textContent ?? style.innerHTML)
        .join('');
      const rule = box!.className
        .split(' ')
        .map((name) => new RegExp(`\\.${name}\\{([^}]*)\\}`).exec(css)?.[1] ?? '')
        .join(';');

      expect(rule).toMatch(/(^|[;\s])width:\s*max-content/);
    });

    it('scrolls the headings and the rows together inside the card when the cell is reserved', () => {
      render(
        <Permissions
          layout={layout}
          renderSubjectActions={({ subject }) => <button type="button">Settings {subject}</button>}
        />
      );

      const scroller = screen.getAllByTestId('permissions-scroll')[0];

      expect(scroller).toHaveStyle({ overflowX: 'auto' });
      // The column headings and the rows are in it, so they move as one
      expect(within(scroller).getAllByTestId('subject-actions-cell').length).toBeGreaterThan(0);
      expect(
        within(scroller).getAllByRole('checkbox', { name: /^Select all .* permissions$/ }).length
      ).toBeGreaterThan(0);
    });

    it('adds no scroll container without it', () => {
      render(<Permissions layout={layout} />);

      expect(screen.queryByTestId('permissions-scroll')).not.toBeInTheDocument();
    });

    it('renders no extra cell without it', () => {
      render(<Permissions layout={layout} />);

      expect(screen.queryByTestId('subject-actions-cell')).not.toBeInTheDocument();
    });
  });

  describe('field rules', () => {
    it('disables the listed action cells of a field and keeps them unticked', async () => {
      const onChange = jest.fn();
      const { user } = render(
        <Permissions
          layout={fieldRulesLayout()}
          // The stored row lists a field the action cannot set
          permissions={[storedRow(CREATE, { fields: ['city', 'emailVerified'] })]}
          onChange={onChange}
        />
      );

      await openAddress(user);

      expect(cell('emailVerified', 'Create')).toBeDisabled();
      expect(cell('emailVerified', 'Create')).not.toBeChecked();
      expect(cell('emailVerified', 'Read')).toBeEnabled();
      expect(cell('city', 'Create')).toBeChecked();

      // None of the bulk ticks reaches it. The column of the action:
      await user.click(screen.getByRole('checkbox', { name: 'Select all Create permissions' }));

      expect(onChange).toHaveBeenLastCalledWith([
        {
          action: CREATE,
          subject: ADDRESS,
          conditions: [],
          properties: { fields: ['city', 'street'] },
        },
      ]);

      // The row of the field, which still ticks the cells it has an action for:
      await user.click(
        screen.getByRole('checkbox', { name: 'Select all emailVerified permissions' })
      );

      expect(cell('emailVerified', 'Read')).toBeChecked();
      expect(cell('emailVerified', 'Create')).not.toBeChecked();

      // The action of the content type, then the content type:
      await user.click(screen.getByRole('checkbox', { name: 'Select Create Address permission' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Create Address permission' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select all Address permissions' }));

      expect(cell('city', 'Create')).toBeChecked();
      expect(cell('emailVerified', 'Create')).not.toBeChecked();
      expect(onChange).toHaveBeenLastCalledWith([
        {
          action: READ,
          subject: ADDRESS,
          conditions: [],
          properties: { fields: ['city', 'street', 'emailVerified'] },
        },
        {
          action: CREATE,
          subject: ADDRESS,
          conditions: [],
          properties: { fields: ['city', 'street'] },
        },
      ]);
    });

    it('applies the rules to the fields of a group', async () => {
      const onChange = jest.fn();
      const { user } = render(
        <Permissions
          layout={fieldRulesLayout([
            { value: 'city', label: 'city' },
            {
              value: 'seo',
              label: 'seo',
              children: [
                { value: 'title', label: 'title', required: true },
                { value: 'robots', label: 'robots', disabledActions: [CREATE] },
              ],
            },
          ])}
          requiredFieldsAction={CREATE}
          onChange={onChange}
        />
      );

      await openAddress(user);
      await user.click(screen.getByRole('button', { name: 'seo' }));

      // Under Read every field of the group can be set
      ['seo', 'seo title', 'seo robots'].forEach((field) => {
        expect(cell(field, 'Read')).toBeEnabled();
      });

      // Under Create one field of the group cannot be set
      expect(cell('seo robots', 'Create')).toBeDisabled();
      expect(cell('seo robots', 'Create')).not.toBeChecked();
      expect(cell('seo title', 'Create')).toBeEnabled();

      await user.click(cell('city', 'Create'));

      expect(await screen.findByText('seo.title', { selector: 'code' })).toBeInTheDocument();

      // The group ticks the field it can
      await user.click(cell('seo', 'Create'));

      expect(cell('seo title', 'Create')).toBeChecked();
      expect(cell('seo robots', 'Create')).not.toBeChecked();
      expect(screen.queryByText(/Create requests will fail/)).not.toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith([
        {
          action: CREATE,
          subject: ADDRESS,
          conditions: [],
          properties: { fields: ['city', 'seo.title'] },
        },
      ]);
    });

    describe('with the permissions of the user', () => {
      const held = (action: string, properties: Record<string, unknown> = {}) => ({
        action,
        subject: ADDRESS,
        properties,
        conditions: [],
      });

      it('does not explain a cell the layout disables as a permission the user does not hold', async () => {
        const { user } = render(
          <Permissions layout={fieldRulesLayout()} userPermissions={[held(READ), held(CREATE)]} />
        );

        await openAddress(user);

        expect(cell('emailVerified', 'Create')).toBeDisabled();
        expect(cell('emailVerified', 'Create').closest('[role="group"]')).not.toBeInTheDocument();

        // The bulk ticks of the user's permissions leave it alone too
        await user.click(screen.getByRole('checkbox', { name: 'Select all Create permissions' }));

        expect(cell('city', 'Create')).toBeChecked();
        expect(cell('emailVerified', 'Create')).not.toBeChecked();
      });
    });

    it('lists locked rows with their note and no checkbox', async () => {
      const { user } = render(<Permissions layout={fieldRulesLayout()} />);

      expect(screen.queryByText('password')).not.toBeInTheDocument();

      await openAddress(user);

      expect(screen.getByText('password')).toBeInTheDocument();
      expect(screen.getByText('Hidden from responses')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /password/ })).not.toBeInTheDocument();
    });

    it('warns when create is granted without a required field, and names it', async () => {
      const { user } = render(
        <Permissions layout={fieldRulesLayout()} requiredFieldsAction={CREATE} />
      );

      await openAddress(user);

      expect(screen.queryByText(/Create requests will fail/)).not.toBeInTheDocument();

      // The required `city` is not ticked
      await user.click(cell('street', 'Create'));

      expect(await screen.findByText(/Create requests will fail/)).toBeInTheDocument();
      expect(screen.getByText('city', { selector: 'code' })).toBeInTheDocument();
      expect(screen.getByText(/is required, but this role can't set it/)).toBeInTheDocument();

      await user.click(cell('city', 'Create'));

      expect(screen.queryByText(/Create requests will fail/)).not.toBeInTheDocument();
    });

    it('warns about a required field the action can never set, and only about the ones missing', async () => {
      const { user } = render(
        <Permissions
          layout={fieldRulesLayout([
            { value: 'city', label: 'city', required: true, disabledActions: [CREATE] },
            { value: 'street', label: 'street', required: true },
            { value: 'zip', label: 'zip', required: true },
          ])}
          requiredFieldsAction={CREATE}
        />
      );

      await openAddress(user);
      await user.click(screen.getByRole('checkbox', { name: 'Select Create Address permission' }));

      // Ticking the action ticked `street` and `zip`, but `city` is required and disabled
      expect(await screen.findByText(/Create requests will fail/)).toBeInTheDocument();
      expect(screen.getByText('city', { selector: 'code' })).toBeInTheDocument();
      expect(screen.queryByText('street', { selector: 'code' })).not.toBeInTheDocument();
      expect(screen.queryByText('zip', { selector: 'code' })).not.toBeInTheDocument();
    });

    it('does not warn about the required fields when another action is granted', async () => {
      const { user } = render(
        <Permissions layout={fieldRulesLayout()} requiredFieldsAction={CREATE} />
      );

      await openAddress(user);
      await user.click(cell('street', 'Read'));

      expect(screen.queryByText(/requests will fail/)).not.toBeInTheDocument();
    });

    it('renders an action indicator in the cell of each content type', () => {
      const renderActionIndicator = jest.fn(({ actionId }: { actionId: string }) =>
        actionId === READ ? <span>dot</span> : null
      );

      render(<Permissions layout={layout} renderActionIndicator={renderActionIndicator} />);

      expect(screen.getAllByText('dot')).toHaveLength(2);
      expect(renderActionIndicator).toHaveBeenCalledWith({ actionId: READ, subject: ADDRESS });
      expect(renderActionIndicator).toHaveBeenCalledWith({ actionId: READ, subject: CATEGORY });
    });
  });
  describe('a tab with nothing in it', () => {
    const noSubjects = { subjects: [], actions: [] };
    const emptyLayout = {
      conditions: [],
      sections: { collectionTypes: noSubjects, singleTypes: noSubjects, plugins: [], settings: [] },
    } as unknown as PermissionsLayout;

    const expectNoSearch = (kind: SearchKind) =>
      expect(screen.queryByRole('button', { name: searchLabel(kind) })).not.toBeInTheDocument();

    it('says there are no collection types or single types, and links to the Content-Type Builder', async () => {
      const { user } = render(<Permissions layout={emptyLayout} searchable />);

      expect(screen.getByText('No collection types yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Open the Content-Type Builder' })).toHaveAttribute(
        'href',
        '/plugins/content-type-builder'
      );
      // Nothing to search or to tick
      expectNoSearch('content-types');
      expect(
        screen.queryByRole('checkbox', { name: /^Select all .* permissions$/ })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Single Types' }));

      expect(screen.getByText('No single types yet')).toBeInTheDocument();
      expect(screen.queryByText('No collection types yet')).not.toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Open the Content-Type Builder' })
      ).toBeInTheDocument();
      expectNoSearch('content-types');
    });

    it('says there is nothing to set in a plugins or settings tab with no action', async () => {
      const { user } = render(<Permissions layout={emptyLayout} searchable />);

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));

      expect(screen.getByText('Nothing to set here')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expectNoSearch('plugins');

      await user.click(screen.getByRole('tab', { name: 'Settings' }));

      expect(screen.getByText('Nothing to set here')).toBeInTheDocument();
      expectNoSearch('settings');
    });

    it('leaves a tab that has something as it is', async () => {
      // `searchLayout` has content types, single types and plugins, but no settings
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      expect(screen.queryByText('No collection types yet')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: searchLabel('content-types') })
      ).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Single Types' }));

      expect(screen.queryByText('No single types yet')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));

      expect(screen.queryByText('Nothing to set here')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: searchLabel('plugins') })).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Settings' }));

      expect(screen.getByText('Nothing to set here')).toBeInTheDocument();
    });

    it('still says when a search matches nothing in a tab that has content', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'zzz');

      expect(screen.getByText('No content types or fields match “zzz”.')).toBeInTheDocument();
      expect(screen.queryByText('No collection types yet')).not.toBeInTheDocument();
    });
  });
  describe('searchable', () => {
    it('has no search unless it is asked for', () => {
      render(<Permissions layout={searchLayout} />);

      expect(
        screen.queryByRole('button', { name: searchLabel('content-types') })
      ).not.toBeInTheDocument();
    });

    it('filters the content types by their label', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'ADDR');

      expect(screen.getByRole('button', { name: 'Address' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Category' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Restaurant' })).not.toBeInTheDocument();
    });

    it('opens the content type whose field matches, listing the matching fields only', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'street');

      expect(screen.queryByRole('button', { name: 'Category' })).not.toBeInTheDocument();
      // Without a click: the field is on screen
      expect(cell('street', 'Read')).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select city Read permission' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select seo Read permission' })
      ).not.toBeInTheDocument();
    });

    it('lists every field of a content type that matches by its label', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'addr');

      // Nothing in it matches, so nothing opens it
      expect(
        screen.queryByRole('checkbox', { name: 'Select city Read permission' })
      ).not.toBeInTheDocument();

      await openAddress(user);

      expect(cell('city', 'Read')).toBeInTheDocument();
      expect(cell('street', 'Read')).toBeInTheDocument();
      expect(cell('seo', 'Read')).toBeInTheDocument();
    });

    it('opens the group a nested field matches in, with the matching fields only', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'title');

      // `homepage` is another tab, `address` is the only content type left here
      expect(screen.getByRole('button', { name: 'Address' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Category' })).not.toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Select seo title Read permission' })
      ).toBeVisible();
      expect(
        screen.queryByRole('checkbox', { name: 'Select seo description Read permission' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select city Read permission' })
      ).not.toBeInTheDocument();
    });

    it('lists every field of a group that matches by its label', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'seo');

      expect(cell('seo', 'Read')).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select city Read permission' })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'seo' }));

      expect(
        screen.getByRole('checkbox', { name: 'Select seo title Read permission' })
      ).toBeVisible();
      expect(
        screen.getByRole('checkbox', { name: 'Select seo description Read permission' })
      ).toBeVisible();
    });

    it('says when nothing matches, and offers no column to tick', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'zzz');

      expect(screen.getByText('No content types or fields match “zzz”.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Address' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select all Read permissions' })
      ).not.toBeInTheDocument();
    });

    it('turns off a column that none of the listed content types has, without blaming the user', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      expect(
        screen.getByRole('checkbox', { name: 'Select all Publish permissions' })
      ).toBeEnabled();

      await searchFor(user, 'cat');

      expect(
        screen.getByRole('checkbox', { name: 'Select all Publish permissions' })
      ).toBeDisabled();
      expect(
        screen.queryByRole('group', {
          name: "You can't grant a permission you don't have yourself",
        })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select all Read permissions' })).toBeEnabled();
    });

    it('lists everything again once it is cleared', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'addr');
      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(screen.getByRole('button', { name: 'Address' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Restaurant' })).toBeInTheDocument();
    });

    it('starts over in each tab', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await searchFor(user, 'addr');
      await user.click(screen.getByRole('tab', { name: 'Single Types' }));

      expect(screen.getByRole('button', { name: 'Homepage' })).toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Collection Types' }));

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument();
    });

    it('never changes the form', async () => {
      const onChange = jest.fn();
      const ref = React.createRef<PermissionsAPI>();
      const { user } = render(
        <Permissions ref={ref} layout={searchLayout} searchable onChange={onChange} />
      );

      await searchFor(user, 'addr');
      await openAddress(user);
      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(onChange).not.toHaveBeenCalled();
      expect(ref.current!.getPermissions().permissionsToSend).toEqual([]);
    });

    it('keeps enter from submitting the form it is in', async () => {
      const { user } = render(
        <form>
          <Permissions layout={searchLayout} searchable />
        </form>
      );
      const searchbox = await openSearch(user);

      // Enter in a field submits its form, which would save the role: the keystroke is cancelled
      expect(fireEvent.keyDown(searchbox, { key: 'Enter' })).toBe(false);
      expect(fireEvent.keyDown(searchbox, { key: 'a' })).toBe(true);
    });

    it('searches the plugins by name, and their actions by label', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await searchFor(user, 'other', 'plugins');

      expect(screen.getByRole('button', { name: 'Other other plugin' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Myplugin myplugin plugin' })
      ).not.toBeInTheDocument();

      await user.clear(screen.getByRole('searchbox', { name: searchLabel('plugins') }));
      await user.type(screen.getByRole('searchbox', { name: searchLabel('plugins') }), 'edit');

      expect(screen.getByRole('button', { name: 'Myplugin myplugin plugin' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Other other plugin' })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Edit the thing' })).toBeVisible();
      expect(screen.queryByRole('checkbox', { name: 'Access my plugin' })).not.toBeInTheDocument();
    });

    it('lists every action of a plugin that matches by its name, and says when nothing matches', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await searchFor(user, 'myplug', 'plugins');

      expect(screen.getByRole('checkbox', { name: 'Edit the thing' })).toBeVisible();
      expect(screen.getByRole('checkbox', { name: 'Access my plugin' })).toBeVisible();

      await user.type(screen.getByRole('searchbox', { name: searchLabel('plugins') }), 'zzz');

      expect(screen.getByText('No plugins or actions match “myplugzzz”.')).toBeInTheDocument();
    });
  });

  describe('searchable, what it opens', () => {
    it('opens the first content type that has a field matching, not one listed by its label alone', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions
          layout={labelFirstLayout}
          searchable
          onOpenSubjectChange={onOpenSubjectChange}
        />
      );

      await searchFor(user, 'alpha');

      // `alpha` is listed first, by its label; `beta` is the first with a field that matches
      expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Gamma' })).toBeInTheDocument();
      expect(cell('alpha-beta', 'Read')).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select x Read permission' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select alpha-gamma Read permission' })
      ).not.toBeInTheDocument();
      // One report, for the first letter that opened it: later letters leave it open
      expect(onOpenSubjectChange).toHaveBeenCalledTimes(1);
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'collectionTypes',
        id: 'api::beta.beta',
      });
    });

    it('opens the content type again on each change of the search, and not on one that changes nothing', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={searchLayout} searchable onOpenSubjectChange={onOpenSubjectChange} />
      );

      await searchFor(user, 'str');

      expect(cell('street', 'Read')).toBeInTheDocument();

      // The admin closes it
      await openAddress(user);

      expect(
        screen.queryByRole('checkbox', { name: 'Select street Read permission' })
      ).not.toBeInTheDocument();
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith(null);

      // A space leaves the search as it was
      await user.type(screen.getByRole('searchbox', { name: searchLabel('content-types') }), ' ');

      expect(
        screen.queryByRole('checkbox', { name: 'Select street Read permission' })
      ).not.toBeInTheDocument();

      await user.type(
        screen.getByRole('searchbox', { name: searchLabel('content-types') }),
        '{Backspace}e'
      );

      expect(cell('street', 'Read')).toBeInTheDocument();
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'collectionTypes',
        id: ADDRESS,
      });
    });

    it('leaves the open content type as it is when only a label matches, and when the search is cleared', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={searchLayout} searchable onOpenSubjectChange={onOpenSubjectChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Category' }));

      const searchbox = await openSearch(user);

      // The text is set at once, so no letter on the way opens anything
      fireEvent.change(searchbox, { target: { value: 'cat' } });

      // `category` is listed by its label alone, and still open
      expect(screen.queryByRole('button', { name: 'Address' })).not.toBeInTheDocument();
      expect(cell('name', 'Read')).toBeInTheDocument();

      await user.clear(searchbox);

      expect(screen.getByRole('button', { name: 'Address' })).toBeInTheDocument();
      expect(cell('name', 'Read')).toBeInTheDocument();

      // A search for a field opens another one; clearing it leaves that one open
      fireEvent.change(searchbox, { target: { value: 'cuisine' } });

      expect(cell('cuisine', 'Read')).toBeInTheDocument();

      await user.clear(searchbox);

      expect(cell('cuisine', 'Read')).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select name Read permission' })
      ).not.toBeInTheDocument();
      expect(onOpenSubjectChange).toHaveBeenCalledTimes(2);
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'collectionTypes',
        id: RESTAURANT,
      });
    });

    it('opens the first plugin the search lists, and keeps the open one while it is listed', async () => {
      const onOpenSubjectChange = jest.fn();
      const { user } = render(
        <Permissions layout={searchLayout} searchable onOpenSubjectChange={onOpenSubjectChange} />
      );

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await searchFor(user, 'e', 'plugins');

      // Both plugins are listed, nothing was open: the first opens
      expect(screen.getByRole('checkbox', { name: 'Edit the thing' })).toBeVisible();
      expect(screen.queryByRole('checkbox', { name: 'Look at other' })).not.toBeInTheDocument();
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'plugins',
        id: 'plugin::myplugin',
      });

      // The admin opens the other one: it stays open while it is listed
      await user.click(screen.getByRole('button', { name: 'Other other plugin' }));
      await user.type(screen.getByRole('searchbox', { name: searchLabel('plugins') }), 'r');

      expect(screen.getByRole('checkbox', { name: 'Look at other' })).toBeVisible();

      // Only the first one is left: it opens in its place
      await user.clear(screen.getByRole('searchbox', { name: searchLabel('plugins') }));
      await user.type(screen.getByRole('searchbox', { name: searchLabel('plugins') }), 'edit');

      expect(screen.getByRole('checkbox', { name: 'Edit the thing' })).toBeVisible();
      expect(onOpenSubjectChange).toHaveBeenLastCalledWith({
        tab: 'plugins',
        id: 'plugin::myplugin',
      });
    });

    it('leaves the open plugin as it is when nothing is listed or the search is cleared', async () => {
      const { user } = render(<Permissions layout={searchLayout} searchable />);

      await user.click(screen.getByRole('tab', { name: 'Plugins' }));
      await user.click(screen.getByRole('button', { name: 'Other other plugin' }));
      await searchFor(user, 'zzz', 'plugins');

      expect(screen.getByText('No plugins or actions match “zzz”.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(screen.getByRole('checkbox', { name: 'Look at other' })).toBeVisible();
      expect(screen.queryByRole('checkbox', { name: 'Edit the thing' })).not.toBeInTheDocument();
    });

    it('opens the first settings category the search lists', async () => {
      const { user } = render(<Permissions layout={layout} searchable />);

      await user.click(screen.getByRole('tab', { name: 'Settings' }));
      await searchFor(user, 'locales', 'settings');

      expect(screen.getByRole('checkbox', { name: 'Create' })).toBeVisible();
      expect(
        screen.queryByRole('checkbox', { name: 'Access the Email Settings page' })
      ).not.toBeInTheDocument();
    });
  });

  describe('confirmBulkChange', () => {
    it('asks before a column select-all and keeps the form when it is refused', async () => {
      const onChange = jest.fn();
      const confirmBulkChange = jest.fn().mockResolvedValue(false);
      const { user } = render(
        <Permissions
          layout={searchLayout}
          confirmBulkChange={confirmBulkChange}
          onChange={onChange}
        />
      );

      await user.click(columnReadCheckbox());

      expect(confirmBulkChange).toHaveBeenCalledTimes(1);
      expect(confirmBulkChange).toHaveBeenCalledWith({
        tab: 'collectionTypes',
        actionId: READ,
        label: 'Read',
        subjects: [ADDRESS, CATEGORY, RESTAURANT],
        value: true,
        filtered: false,
      });
      expect(onChange).not.toHaveBeenCalled();
      expect(columnReadCheckbox()).not.toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Select Read address permission' })
      ).not.toBeChecked();
    });

    it('applies the select-all once it is confirmed, and asks again to remove it', async () => {
      const onChange = jest.fn();
      const confirmBulkChange = jest.fn().mockResolvedValue(true);
      const { user } = render(
        <Permissions
          layout={searchLayout}
          confirmBulkChange={confirmBulkChange}
          onChange={onChange}
        />
      );

      await user.click(columnReadCheckbox());

      await waitFor(() => expect(columnReadCheckbox()).toBeChecked());
      expect(onChange).toHaveBeenLastCalledWith(
        [ADDRESS, CATEGORY, RESTAURANT].map((subject) =>
          expect.objectContaining({ action: READ, subject })
        )
      );

      await user.click(columnReadCheckbox());

      expect(confirmBulkChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ actionId: READ, value: false, filtered: false })
      );
      await waitFor(() => expect(columnReadCheckbox()).not.toBeChecked());
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('tells which tab the column is in', async () => {
      const confirmBulkChange = jest.fn().mockResolvedValue(false);
      const { user } = render(
        <Permissions layout={searchLayout} confirmBulkChange={confirmBulkChange} />
      );

      await user.click(screen.getByRole('tab', { name: 'Single Types' }));
      await user.click(columnReadCheckbox());

      expect(confirmBulkChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tab: 'singleTypes',
          subjects: ['api::homepage.homepage'],
        })
      );
    });

    it('does not ask for anything but a column', async () => {
      const confirmBulkChange = jest.fn().mockResolvedValue(true);
      const { user } = render(
        <Permissions layout={searchLayout} confirmBulkChange={confirmBulkChange} />
      );

      await user.click(screen.getByRole('checkbox', { name: 'Select Read address permission' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select all Address permissions' }));

      expect(confirmBulkChange).not.toHaveBeenCalled();
      expect(
        screen.getByRole('checkbox', { name: 'Select all Address permissions' })
      ).toBeChecked();
    });

    it('ignores a second click while the answer is pending', async () => {
      let answer: (confirmed: boolean) => void = () => {};
      const confirmBulkChange = jest.fn(
        () => new Promise<boolean>((resolve) => (answer = resolve))
      );
      const { user } = render(
        <Permissions layout={searchLayout} confirmBulkChange={confirmBulkChange} />
      );

      await user.click(columnReadCheckbox());
      await user.click(screen.getByRole('checkbox', { name: 'Select all Create permissions' }));

      expect(confirmBulkChange).toHaveBeenCalledTimes(1);

      await act(async () => answer(true));

      await waitFor(() => expect(columnReadCheckbox()).toBeChecked());
      expect(
        screen.getByRole('checkbox', { name: 'Select all Create permissions' })
      ).not.toBeChecked();

      // Answered: the column can be asked about again
      await user.click(screen.getByRole('checkbox', { name: 'Select all Create permissions' }));

      expect(confirmBulkChange).toHaveBeenCalledTimes(2);
    });

    it('applies without asking when there is nothing to ask', async () => {
      const onChange = jest.fn();
      const { user } = render(<Permissions layout={searchLayout} onChange={onChange} />);

      await user.click(columnReadCheckbox());

      // Synchronous: no promise to wait for
      expect(columnReadCheckbox()).toBeChecked();
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchable with confirmBulkChange', () => {
    it('changes the visible content types only, and says the search limits them', async () => {
      const onChange = jest.fn();
      const confirmBulkChange = jest.fn().mockResolvedValue(true);
      const { user } = render(
        <Permissions
          layout={searchLayout}
          searchable
          confirmBulkChange={confirmBulkChange}
          onChange={onChange}
        />
      );

      await searchFor(user, 'addr');
      await user.click(columnReadCheckbox());

      expect(confirmBulkChange).toHaveBeenCalledWith({
        tab: 'collectionTypes',
        actionId: READ,
        label: 'Read',
        subjects: [ADDRESS],
        value: true,
        filtered: true,
      });
      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ action: READ, subject: ADDRESS }),
      ]);
      // The column shows the content types that are listed
      expect(columnReadCheckbox()).toBeChecked();

      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(
        screen.getByRole('checkbox', { name: 'Select Read category permission' })
      ).not.toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Select Read restaurant permission' })
      ).not.toBeChecked();
      expect(columnReadCheckbox()).toBePartiallyChecked();
    });

    it('applies the select-all to the visible content types without a confirmation', async () => {
      const ref = React.createRef<PermissionsAPI>();
      const { user } = render(<Permissions ref={ref} layout={searchLayout} searchable />);

      await searchFor(user, 'addr');
      await user.click(columnReadCheckbox());

      expect(ref.current!.getPermissions().permissionsToSend).toEqual([
        expect.objectContaining({ action: READ, subject: ADDRESS }),
      ]);

      // And removes it from them only
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Read category permission' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select Read restaurant permission' }));
      await searchFor(user, 'cat');
      await user.click(columnReadCheckbox());

      expect(ref.current!.getPermissions().permissionsToSend).toEqual([
        expect.objectContaining({ action: READ, subject: ADDRESS }),
        expect.objectContaining({ action: READ, subject: RESTAURANT }),
      ]);
    });
  });
});
