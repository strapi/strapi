import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import LocaleSettingsPage from '..';
import themes from '../../../../../../strapi-admin/admin/src/themes';

// TODO: we should not be forced to mock this module
// but it bugs somehow when run with jest
jest.mock('strapi-helper-plugin', () => ({
  BaselineAlignment: () => <div />,
  // eslint-disable-next-line react/prop-types
  ModalConfirm: ({ onConfirm, isOpen }) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onConfirm} type="button">
          Confirm
        </button>
      </div>
    ) : null,
}));

jest.mock('../../../utils', () => ({
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }) => id,
  }),
}));

describe('i18n settings page', () => {
  describe('initial state', () => {
    it('shows default EN locale with edit button but no delete button', async () => {
      render(
        <ThemeProvider theme={themes}>
          <LocaleSettingsPage />
        </ThemeProvider>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      expect(rowUtils.queryByLabelText('Delete locale')).toBeFalsy();
      expect(rowUtils.getByLabelText('Edit locale')).toBeVisible();
      expect(rowUtils.getByText('Settings.locales.row.default-locale')).toBeVisible();
      expect(rowUtils.getByText('en-US')).toBeVisible();
    });

    it('shows FR locale with edit button and delete button', async () => {
      render(
        <ThemeProvider theme={themes}>
          <LocaleSettingsPage />
        </ThemeProvider>
      );

      const row = await waitFor(() => screen.getByText('French').closest('tr'));
      const rowUtils = within(row);

      expect(rowUtils.getByLabelText('Delete locale')).toBeVisible();
      expect(rowUtils.getByLabelText('Edit locale')).toBeVisible();
      expect(rowUtils.getByText('fr-FR')).toBeVisible();
    });
  });

  describe('delete', () => {
    it('removes the locale when clicking the confirmation button', async () => {
      render(
        <ThemeProvider theme={themes}>
          <LocaleSettingsPage />
        </ThemeProvider>
      );

      const row = await waitFor(() => screen.getByText('French').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Delete locale'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeVisible();

      fireEvent.click(screen.getByText('Confirm'));
    });
  });
});
