import { render, screen } from '@strapi/admin/strapi-admin/test';
import { userEvent } from '@testing-library/user-event';

import { RenameMigrationModal, type PendingRename } from '../RenameMigrationModal';

const renames: PendingRename[] = [
  {
    key: 'api::article.article:chain:0',
    uid: 'api::article.article',
    typeName: 'Article',
    pairs: [{ oldName: 'title', newName: 'heading' }],
    via: [],
  },
  {
    key: 'api::article.article:chain:1',
    uid: 'api::article.article',
    typeName: 'Article',
    pairs: [
      { oldName: 'body', newName: 'summary' },
      { oldName: 'summary', newName: 'body' },
    ],
    via: ['tmp'],
  },
];

const setup = (items: PendingRename[] = renames) => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  render(<RenameMigrationModal renames={items} onConfirm={onConfirm} onCancel={onCancel} />);

  return { onConfirm, onCancel, user: userEvent.setup() };
};

describe('CTB | RenameMigrationModal', () => {
  it('lists one checkbox per chain, ticked by default', () => {
    setup();

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Preserve data of title' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Preserve data of body, summary' })).toBeChecked();
  });

  it('renders every pair of a chain and the names it routes through', () => {
    setup();

    expect(screen.getByText('via tmp')).toBeInTheDocument();
    // Both pairs of the swap are listed under the same checkbox.
    expect(screen.getAllByText('body')).toHaveLength(2);
    expect(screen.getAllByText('summary')).toHaveLength(2);
  });

  it('explains a swap-back chain whose net effect is empty', () => {
    setup([
      {
        key: 'api::article.article:chain:0',
        uid: 'api::article.article',
        typeName: 'Article',
        pairs: [
          { oldName: 'a', newName: 'b' },
          { oldName: 'b', newName: 'a' },
        ],
        via: ['b'],
        isSwapBack: true,
      },
    ]);

    expect(
      screen.getByText('Fields swapped back to their original names; data still moves.')
    ).toBeInTheDocument();
  });

  it('confirms with every chain key when nothing is unticked', async () => {
    const { onConfirm, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Preserve data' }));

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['api::article.article:chain:0', 'api::article.article:chain:1'])
    );
  });

  it('drops the whole chain when its checkbox is unticked', async () => {
    const { onConfirm, user } = setup();

    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of body, summary' }));
    await user.click(screen.getByRole('button', { name: 'Preserve data' }));

    expect(onConfirm).toHaveBeenCalledWith(new Set(['api::article.article:chain:0']));
  });

  it('disables "Preserve data" when every row is unticked', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of title' }));
    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of body, summary' }));

    expect(screen.getByRole('button', { name: 'Preserve data' })).toBeDisabled();
  });

  it('confirms with an empty set for "Don\'t preserve data" regardless of the ticks', async () => {
    const { onConfirm, user } = setup();

    await user.click(screen.getByRole('button', { name: "Don't preserve data" }));

    expect(onConfirm).toHaveBeenCalledWith(new Set());
  });

  it('cancels the whole save', async () => {
    const { onCancel, onConfirm, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
