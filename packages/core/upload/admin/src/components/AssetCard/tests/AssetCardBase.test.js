import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AssetCardBase } from '../AssetCardBase';

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ defaultMessage }) => defaultMessage) }),
}));

describe('AssetCardBase', () => {
  const render = (props) =>
    renderRTL(
      <ThemeProvider theme={lightTheme}>
        <AssetCardBase name="Card" extension="png" {...props} />
      </ThemeProvider>
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

    it('should call onEdit when the edit button is clicked after the card has been hovered', () => {
      const onEdit = jest.fn();
      const { getAllByRole } = render({
        onEdit,
      });

      const [card, button] = getAllByRole('button');

      userEvent.hover(card);

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      fireEvent.click(button);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onRemove when the remove button is clicked after the card has been hovered', () => {
      const onRemove = jest.fn();
      const { getAllByRole } = render({
        onRemove,
      });

      const [card, button] = getAllByRole('button');

      userEvent.hover(card);

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      fireEvent.click(button);

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
    it('should focus checkbox when the card is first tabbed too', () => {
      const { getByRole } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      });

      userEvent.tab();

      expect(getByRole('checkbox')).toHaveFocus();
    });

    it('should focus the edit button and change their opacity when the card is tabbed too', () => {
      const { getAllByRole } = render({
        onSelect: jest.fn(),
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      });

      userEvent.tab();
      userEvent.tab();

      const button = getAllByRole('button')[1];

      waitFor(() => expect(button.parentElement).toHaveStyle('opacity: 1'));

      expect(button).toHaveFocus();
    });
  });
});
