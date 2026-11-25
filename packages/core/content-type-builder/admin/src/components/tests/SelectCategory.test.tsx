import { render, screen } from '@strapi/admin/strapi-admin/test';
import { userEvent } from '@testing-library/user-event';

import { SelectCategory } from '../SelectCategory';

jest.mock('../DataManager/useDataManager', () => ({
  useDataManager: jest.fn(() => ({
    allComponentsCategories: ['blog', 'seo'],
  })),
}));

const intlLabel = { id: 'category', defaultMessage: 'Category' };

const setup = (props: Partial<React.ComponentProps<typeof SelectCategory>> = {}) => {
  const onChange = jest.fn();

  render(
    <SelectCategory
      intlLabel={intlLabel}
      name="category"
      onChange={onChange}
      isCreating
      {...props}
    />
  );

  return { onChange, user: userEvent.setup() };
};

describe('CTB | SelectCategory', () => {
  it('dispatches a typed select-category change when a category is picked', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('combobox', { name: /category/i }));
    await user.click(screen.getByRole('option', { name: 'blog' }));

    expect(onChange).toHaveBeenCalledWith({
      target: { name: 'category', value: 'blog', type: 'select-category' },
    });
  });

  it('dispatches a typed change when creating a new category', async () => {
    // Exercises handleCreateOption, which also gained the `value === undefined` guard.
    const { onChange, user } = setup();

    await user.click(screen.getByRole('combobox', { name: /category/i }));
    await user.type(screen.getByRole('combobox', { name: /category/i }), 'marketing');
    await user.click(screen.getByRole('option', { name: /marketing/i }));

    expect(onChange).toHaveBeenCalledWith({
      target: { name: 'category', value: 'marketing', type: 'select-category' },
    });
  });
});

// NOTE: the "clear" path of handleChange's `value === undefined` guard is not exercised — the
// Combobox is not wired with a clear button (no onClear/clearLabel), so the guard is defensive
// only. Not worth a brittle text-clearing simulation.
