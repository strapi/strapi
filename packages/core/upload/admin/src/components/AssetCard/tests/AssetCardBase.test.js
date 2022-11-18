import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IntlProvider } from 'react-intl';
import { AssetCardBase } from '../AssetCardBase';

describe('AssetCardBase', () => {
  const render = (props) =>
    renderRTL(
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <ThemeProvider theme={lightTheme}>
          <AssetCardBase name="Card" extension="png" {...props} />
        </ThemeProvider>
      </IntlProvider>
    );

  describe('Interaction', () => {
    it('should call onSelect when the checkbox is clicked', () => {
      const onSelect = jest.fn();
      const { getByRole } = render({
        onSelect,
      });

      const checkbox = getByRole('checkbox');

      fireEvent.click(checkbox);

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when the edit button is clicked after the card has been hovered', async () => {
      const onEdit = jest.fn();
      const user = userEvent.setup();
      const { getAllByRole } = render({
        onEdit,
      });

      const [card, button] = getAllByRole('button');

      await user.hover(card);

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      fireEvent.click(button);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onRemove when the remove button is clicked after the card has been hovered', async () => {
      const onRemove = jest.fn();
      const user = userEvent.setup();
      const { getAllByRole } = render({
        onRemove,
      });

      const [card, button] = getAllByRole('button');

      await user.hover(card);

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      await user.click(button);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when the card is clicked', () => {
      const onEdit = jest.fn();
      const { getAllByRole } = render({
        onEdit,
      });

      const card = getAllByRole('button')[0];

      fireEvent.click(card);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus checkbox when the card is first tabbed too', async () => {
      const user = userEvent.setup();
      const { getByRole } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      });

      await user.tab();

      expect(getByRole('checkbox')).toHaveFocus();
    });

    it('should focus the edit button and change their opacity when the card is tabbed too', async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      });

      await user.tab();
      await user.tab();

      const button = getAllByRole('button')[1];

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      expect(button).toHaveFocus();
    });
  });
});
