import { within } from '@testing-library/react';
import { render, screen, waitFor } from '@tests/utils';

import { SubjectSettingsModal } from '../SubjectSettingsModal';

import type {
  DataAction,
  LayoutCondition,
  LayoutContentType,
  LayoutField,
} from '../../../../../../shared/contracts/permissions';
import type { SubjectSettings } from '../../utils/editorModel';

const IS_OWNER: LayoutCondition = {
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  source: 'builtin',
  // What the layout sends for a type with one relation to the user
  params: [
    {
      name: 'field',
      type: 'attribute',
      required: false,
      accepts: { relation: 'plugin::end-users.user' },
    },
    { name: 'setOnCreate', type: 'boolean', required: false, default: true, createOnly: true },
  ],
};

const IS_VIP: LayoutCondition = {
  name: 'api::is-vip',
  displayName: 'Is VIP',
  source: 'builder',
  params: [],
};

const USER = 'plugin::end-users.user';

const relation = (name: string, relationTarget: string): LayoutField => ({
  name,
  label: name,
  type: 'relation',
  required: false,
  engineOwned: false,
  relationTarget,
});

const text = (name: string): LayoutField => ({
  name,
  label: name,
  type: 'string',
  required: false,
  engineOwned: false,
});

const articleWith = (
  conditions: LayoutCondition[],
  fields: LayoutField[] = [relation('owner', USER), text('title')]
): LayoutContentType => ({
  uid: 'api::article.article',
  label: 'Article',
  kind: 'collectionType',
  actions: [],
  fields,
  locked: [],
  conditions,
});

const NOTHING: SubjectSettings = { populateDepth: null, conditions: {} };

interface Options {
  conditions?: LayoutCondition[];
  granted?: DataAction[];
  fields?: LayoutField[];
  value?: SubjectSettings;
  disabled?: boolean;
}

/** The modal, opened from its Settings button */
const setup = async ({
  conditions = [IS_OWNER, IS_VIP],
  granted = ['find', 'update'],
  fields,
  value = NOTHING,
  disabled = false,
}: Options = {}) => {
  const onApply = jest.fn();
  const { user } = render(
    <SubjectSettingsModal
      contentType={articleWith(conditions, fields)}
      granted={granted}
      value={value}
      disabled={disabled}
      onApply={onApply}
    />
  );

  await user.click(screen.getByRole('button', { name: 'Settings' }));

  const dialog = await screen.findByRole('dialog', { name: 'Article, Settings' });

  return { user, onApply, dialog };
};

/** Opens the conditions select of an action's row and ticks the named ones */
const choose = async (
  user: Awaited<ReturnType<typeof setup>>['user'],
  action: string,
  names: string[]
) => {
  await user.click(screen.getByRole('combobox', { name: `Can ${action} When` }));

  for (const name of names) {
    await user.click(await screen.findByRole('option', { name }));
  }

  await user.keyboard('{Escape}');
};

/** The row of each granted action, apart from the breadcrumbs' list items */
const rows = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('listitem')
    .filter((item) => item.textContent?.startsWith('Can'));

const applyButton = () => screen.getByRole('button', { name: 'Apply' });

describe('SubjectSettingsModal', () => {
  it('renders one row per granted action with a grouped MultiSelect', async () => {
    const { user, dialog } = await setup({ granted: ['find', 'update'] });

    expect(rows(dialog)).toHaveLength(2);
    expect(within(dialog).getByRole('combobox', { name: 'Can Find When' })).toHaveTextContent(
      'Anytime'
    );
    expect(within(dialog).getByRole('combobox', { name: 'Can Update When' })).toBeVisible();
    expect(
      within(dialog).queryByRole('combobox', { name: 'Can Delete When' })
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('combobox', { name: 'Can Find When' }));

    expect(await screen.findByRole('option', { name: 'Built-in' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Builder' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Is owner' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Is VIP' })).toBeVisible();
  });

  it('says what to do when nothing is granted', async () => {
    const { dialog } = await setup({ granted: [] });

    expect(within(dialog).getByText(/Tick an action first/)).toBeVisible();
    expect(within(dialog).queryAllByRole('combobox', { name: /^Can/ })).toHaveLength(0);
  });

  it('says so when no condition applies to the type', async () => {
    const { dialog } = await setup({ conditions: [] });

    expect(within(dialog).getByText('No condition applies to Article.')).toBeVisible();
  });

  it('shows setOnCreate under Create only', async () => {
    const { user, dialog } = await setup({
      granted: ['find', 'create'],
      fields: [relation('owner', USER), relation('reviewer', USER)],
    });

    await choose(user, 'Find', ['Is owner']);
    await choose(user, 'Create', ['Is owner']);

    const [find, create] = rows(dialog);

    expect(within(find).queryByText('Set on create')).not.toBeInTheDocument();
    expect(within(create).getByText('Set on create')).toBeVisible();
  });

  it("lists only the type's attributes that a field input accepts", async () => {
    const { user, dialog } = await setup({
      fields: [
        relation('owner', USER),
        relation('reviewer', USER),
        relation('category', 'api::category.category'),
        text('title'),
      ],
    });

    await choose(user, 'Find', ['Is owner']);
    await user.click(within(dialog).getByRole('combobox', { name: /Field/ }));

    expect(await screen.findByRole('option', { name: 'owner' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'reviewer' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'title' })).not.toBeInTheDocument();
  });

  it('keeps Apply disabled while a needed field is empty with two candidates', async () => {
    const { user, dialog } = await setup({
      fields: [relation('owner', USER), relation('reviewer', USER)],
    });

    await choose(user, 'Find', ['Is owner']);

    expect(applyButton()).toBeDisabled();

    await user.click(within(dialog).getByRole('combobox', { name: /Field/ }));
    await user.click(await screen.findByRole('option', { name: 'reviewer' }));

    expect(applyButton()).toBeEnabled();
  });

  it('enables Apply with one candidate', async () => {
    const { user, dialog } = await setup();

    await choose(user, 'Find', ['Is owner']);

    expect(within(dialog).queryByRole('combobox', { name: /Field/ })).not.toBeInTheDocument();
    expect(applyButton()).toBeEnabled();
  });

  it('applies the chosen conditions and params per action', async () => {
    const { user, onApply } = await setup({
      granted: ['find', 'create'],
      fields: [relation('owner', USER), relation('reviewer', USER)],
    });

    await choose(user, 'Find', ['Is VIP']);
    await choose(user, 'Create', ['Is owner']);
    await user.click(screen.getByRole('combobox', { name: /Field/ }));
    await user.click(await screen.findByRole('option', { name: 'reviewer' }));
    await user.click(applyButton());

    expect(onApply).toHaveBeenCalledWith({
      populateDepth: null,
      conditions: {
        find: [{ name: IS_VIP.name }],
        create: [{ name: IS_OWNER.name, params: { field: 'reviewer', setOnCreate: true } }],
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps a condition the layout lacks until it is unchosen', async () => {
    const value: SubjectSettings = {
      populateDepth: null,
      conditions: { find: [{ name: 'api::gone' }] },
    };
    const { user, onApply } = await setup({ value });

    expect(screen.getByRole('combobox', { name: 'Can Find When' })).toHaveTextContent(
      '1 currently selected'
    );

    await user.click(applyButton());

    expect(onApply).toHaveBeenLastCalledWith(value);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await choose(user, 'Find', ['Unavailable condition api::gone']);
    await user.click(applyButton());

    expect(onApply).toHaveBeenLastCalledWith({ populateDepth: null, conditions: {} });
  });

  it('keeps a stored createOnly param when applied untouched', async () => {
    const value: SubjectSettings = {
      populateDepth: null,
      conditions: {
        update: [{ name: IS_OWNER.name, params: { field: 'owner', setOnCreate: false } }],
      },
    };
    const { user, onApply } = await setup({ value });

    await user.click(applyButton());

    expect(onApply).toHaveBeenCalledWith(value);
  });

  it('keeps stored conditions on an action that is not granted', async () => {
    const value: SubjectSettings = {
      populateDepth: null,
      conditions: { delete: [{ name: IS_VIP.name }] },
    };
    const { user, onApply } = await setup({ value, granted: ['find'] });

    await user.click(applyButton());

    expect(onApply).toHaveBeenCalledWith(value);
  });

  it('shows read-only conditions by group with Close', async () => {
    const { dialog } = await setup({
      disabled: true,
      value: {
        populateDepth: null,
        conditions: { find: [{ name: IS_VIP.name }] },
      },
    });

    expect(
      within(dialog).queryByRole('combobox', { name: 'Can Find When' })
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText('Builder')).toBeVisible();
    expect(within(dialog).getByText('Is VIP')).toBeVisible();
    expect(within(dialog).getByText('No conditions applied.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  it('applies the populate depth, and keeps Mixed until one is chosen', async () => {
    const first = await setup({ value: { populateDepth: 'mixed', conditions: {} } });

    expect(screen.getByRole('combobox', { name: 'Populate depth' })).toHaveTextContent('Mixed');

    await first.user.click(applyButton());

    expect(first.onApply).toHaveBeenLastCalledWith({ populateDepth: 'mixed', conditions: {} });

    await first.user.click(screen.getByRole('button', { name: 'Settings' }));
    await first.user.click(await screen.findByRole('combobox', { name: 'Populate depth' }));
    await first.user.click(await screen.findByRole('option', { name: '3 levels' }));
    await first.user.click(applyButton());

    expect(first.onApply).toHaveBeenLastCalledWith({ populateDepth: 3, conditions: {} });
  });

  it('shows a dot on the button when something is set', async () => {
    const dot = 'A condition or a populate depth is set.';
    const props = {
      contentType: articleWith([IS_VIP]),
      granted: ['find' as const],
      disabled: false,
      onApply: jest.fn(),
    };
    const { rerender } = render(<SubjectSettingsModal {...props} value={NOTHING} />);

    expect(screen.queryByRole('img', { name: dot })).not.toBeInTheDocument();

    rerender(<SubjectSettingsModal {...props} value={{ populateDepth: 2, conditions: {} }} />);

    expect(screen.getByRole('img', { name: dot })).toBeInTheDocument();
  });

  it('forgets what was edited when it is canceled', async () => {
    const { user, onApply } = await setup();

    await choose(user, 'Find', ['Is VIP']);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByRole('combobox', { name: 'Can Find When' })).toHaveTextContent(
      'Anytime'
    );
  });
});
