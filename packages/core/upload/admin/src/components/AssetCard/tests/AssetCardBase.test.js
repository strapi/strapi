import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IntlProvider } from 'react-intl';
import { AssetCardBase } from '../AssetCardBase';

const render = (props) =>
  renderRTL(
    <IntlProvider locale="en" messages={{}} defaultLocale="en">
      <ThemeProvider theme={lightTheme}>
        <AssetCardBase name="Card" extension="png" {...props} />
      </ThemeProvider>
    </IntlProvider>
  );

describe('AssetCardBase', () => {
  describe('Interaction', () => {
    it('should call onSelect when the checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const { getByRole } = render({
        onSelect,
      });

      const checkbox = getByRole('checkbox');

      await user.click(checkbox);

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when the edit button is clicked', async () => {
      const onEdit = jest.fn();
      const user = userEvent.setup();

      const { getByRole } = render({
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
      const user = userEvent.setup();
      const { getByRole } = render({
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
      const user = userEvent.setup();
      const { getAllByRole } = render({
        onEdit,
      });

      const card = getAllByRole('button')[0];

      await user.click(card);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus the checkbox when the card is first tabbed once', async () => {
      const user = userEvent.setup();
      const { getByRole } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      });

      await user.tab();

      expect(getByRole('checkbox')).toHaveFocus();
    });

    it('should focus remove from selection when the card is first tabbed twice', async () => {
      const user = userEvent.setup();
      const { getByRole } = render({
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
      const user = userEvent.setup();
      const { getByRole } = render({
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
