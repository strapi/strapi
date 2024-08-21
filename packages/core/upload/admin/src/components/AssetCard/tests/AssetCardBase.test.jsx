import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { AssetCardBase } from '../AssetCardBase';

const render = (props) => ({
  user: userEvent.setup(),
  ...renderRTL(<AssetCardBase name="Card" extension="png" {...props} />, {
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
      });

      await user.click(getByRole('checkbox'));

      /**
       * If we don't wait for a single tick the assertion will fail.
       */
      waitFor(() => expect(onSelect).toHaveBeenNthCalledWith(1, true));
    });

    it('should call onEdit when the edit button is clicked', async () => {
      const onEdit = jest.fn();

      const { getByRole, user } = render({
        onEdit,
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
      });

      await user.tab();

      expect(getByRole('checkbox')).toHaveFocus();
    });

    it('should focus remove from selection when the card is first tabbed twice', async () => {
      const { getByRole, user } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
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
