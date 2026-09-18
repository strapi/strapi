import { render, screen } from '@strapi/admin/strapi-admin/test';
import { userEvent } from '@testing-library/user-event';

import { RenameMigrationModal, type PendingRename } from '../RenameMigrationModal';

const renames: PendingRename[] = [
  {
    key: 'api::article.article:0',
    uid: 'api::article.article',
    typeName: 'Article',
    oldName: 'title',
    newName: 'heading',
  },
  {
    key: 'api::article.article:1',
    uid: 'api::article.article',
    typeName: 'Article',
    oldName: 'body',
    newName: 'content',
  },
];

const setup = () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  render(<RenameMigrationModal renames={renames} onConfirm={onConfirm} onCancel={onCancel} />);

  return { onConfirm, onCancel, user: userEvent.setup() };
};

describe('CTB | RenameMigrationModal', () => {
  it('lists every hop with its checkbox ticked by default', () => {
    setup();

    expect(screen.getByRole('checkbox', { name: 'Preserve data of title' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Preserve data of body' })).toBeChecked();
  });

  it('confirms with every key when nothing is unticked', async () => {
    const { onConfirm, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Preserve data' }));

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['api::article.article:0', 'api::article.article:1'])
    );
  });

  it('confirms with only the ticked keys', async () => {
    const { onConfirm, user } = setup();

    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of title' }));
    await user.click(screen.getByRole('button', { name: 'Preserve data' }));

    expect(onConfirm).toHaveBeenCalledWith(new Set(['api::article.article:1']));
  });

  it('disables "Preserve data" when every row is unticked', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of title' }));
    await user.click(screen.getByRole('checkbox', { name: 'Preserve data of body' }));

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
