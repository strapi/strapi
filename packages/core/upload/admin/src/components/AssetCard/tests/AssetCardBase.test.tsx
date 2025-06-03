import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { AssetCardBase, AssetCardBaseProps } from '../AssetCardBase';

const render = (props: AssetCardBaseProps) => ({
  user: userEvent.setup(),
  ...renderRTL(<AssetCardBase {...props} />, {
    wrapper: ({ children }) => (
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DesignSystemProvider>{children}</DesignSystemProvider>
      </IntlProvider>
    ),
  }),
});

describe('AssetCardBase', () => {
  describe('Interaction', () => {
    it('should call onSelect when the checkbox is clicked', async () => {
      const onSelect = jest.fn();
      const { getByRole, user } = render({
        onSelect,
        extension: 'png',
        name: 'Card',
        variant: 'Image',
        isSelectable: true,
      });

      await user.click(getByRole('checkbox'));

      /**
       * If we don't wait for a single tick the assertion will fail.
       */
      expect(onSelect).toHaveBeenNthCalledWith(1, true);
    });

    it('should call onEdit when the edit button is clicked', async () => {
      const onEdit = jest.fn();

      const { getByRole, user } = render({
        onEdit,
        extension: 'png',
        name: 'Card',
        variant: 'Image',
        isSelectable: true,
      });

      const editButton = getByRole('button', {
        name: /edit/i,
      });

      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onRemove when the remove button is clicked', async () => {
      const onRemove = jest.fn();

      const { getByRole, user } = render({
        onRemove,
        extension: 'png',
        name: 'Card',
        variant: 'Image',
        isSelectable: true,
      });

      const removeButton = getByRole('button', {
        name: /remove from selection/i,
      });

      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when the card is clicked', async () => {
      const onEdit = jest.fn();

      const { getAllByRole, user } = render({
        onEdit,
        extension: 'png',
        name: 'Card',
        variant: 'Image',
        isSelectable: true,
      });

      const card = getAllByRole('button')[0];

      await user.click(card);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus the checkbox when the card is first tabbed once', async () => {
      const { getByRole, user } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
        name: 'Card',
        extension: 'png',
        variant: 'Image',
        isSelectable: true,
      });

      await user.tab();

      expect(getByRole('checkbox')).toHaveFocus();
    });

    it('should focus remove from selection when the card is first tabbed twice', async () => {
      const { getByRole, user } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
        name: 'Card',
        extension: 'png',
        variant: 'Image',
        isSelectable: true,
      });

      // checkbox
      await user.tab();
      // Remove from selection
      await user.tab();

      const removeSelectionButton = getByRole('button', {
        name: /remove from selection/i,
      });

      expect(removeSelectionButton).toHaveFocus();
    });

    it('should focus the edit button when the card is three times', async () => {
      const { getByRole, user } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
        name: 'Card',
        extension: 'png',
        variant: 'Image',
        isSelectable: true,
      });

      // checkbox
      await user.tab();
      // Remove from selection
      await user.tab();
      // Edit
      await user.tab();

      const editButton = getByRole('button', {
        name: /edit/i,
      });

      expect(editButton).toHaveFocus();
    });
  });
});
