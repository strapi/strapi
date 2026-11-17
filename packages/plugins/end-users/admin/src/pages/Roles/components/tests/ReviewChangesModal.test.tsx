import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { ReviewChangesModal } from '../ReviewChangesModal';

import type { ChangeGroup } from '../../utils/editorModel';

const GROUPS: ChangeGroup[] = [
  {
    group: 'Role',
    changes: [{ label: 'Name', from: 'Premium member', to: 'Premium' }],
  },
  {
    group: 'Article',
    changes: [
      { label: 'Update', from: 'Not granted', to: 'Granted' },
      { label: 'Find fields', from: 'title, body', to: 'every field, including future ones' },
      { label: 'Update fields', added: ['title', 'seo.metaTitle'], removed: ['body'] },
    ],
  },
];

const setup = () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const { user } = render(
    <ReviewChangesModal
      title="Review changes · Premium"
      groups={GROUPS}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );

  return { user, onConfirm, onCancel };
};

describe('ReviewChangesModal', () => {
  it('lists every change under its group', async () => {
    setup();

    const dialog = await screen.findByRole('dialog', { name: 'Review changes · Premium' });

    expect(
      within(dialog)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Role', 'Article']);

    const role = within(dialog).getByRole('region', { name: 'Role' });

    expect(within(role).getByText('Name')).toBeVisible();
    expect(role).toHaveTextContent('Premium member → Premium');

    const article = within(dialog).getByRole('region', { name: 'Article' });

    expect(article).toHaveTextContent('Not granted → Granted');
    // `null` fields are every field: the review says so in as many words
    expect(article).toHaveTextContent('title, body → every field, including future ones');
    expect(article).toHaveTextContent('+ title, seo.metaTitle');
    expect(article).toHaveTextContent('− body');
  });

  it('saves on confirm, once', async () => {
    const { user, onConfirm, onCancel } = setup();

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels on Cancel and on Escape', async () => {
    const { user, onConfirm, onCancel } = setup();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
