/* eslint-disable react/prop-types */

import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import LocaleSettingsPage from '..';
import themes from '../../../../../../strapi-admin/admin/src/themes';

// TODO: we should not be forced to mock this module
// but it bugs somehow when run with jest
jest.mock('strapi-helper-plugin', () => ({
  BaselineAlignment: () => <div />,
  ModalConfirm: ({ onConfirm, isOpen }) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onConfirm} type="button">
          Confirm
        </button>
      </div>
    ) : null,

  Modal: ({ isOpen, children }) => isOpen && <div role="dialog">{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalSection: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
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
  beforeEach(() => {
    strapi.notification.toggle = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

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
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() =>
        expect(strapi.notification.toggle).toBeCalledWith({
          type: 'success',
          message: { id: 'Settings.locales.modal.delete.success' },
        })
      );
    });
  });

  describe('edit', () => {
    it('shows the default edit modal layout', async () => {
      render(
        <ThemeProvider theme={themes}>
          <LocaleSettingsPage />
        </ThemeProvider>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Edit locale'));

      expect(screen.getByText(`Settings.locales.modal.edit.confirmation`)).toBeVisible();
    });

    it('closes the edit modal when clicking on cancel', async () => {
      render(
        <ThemeProvider theme={themes}>
          <LocaleSettingsPage />
        </ThemeProvider>
      );

      const row = await waitFor(() => screen.getByText('English').closest('tr'));
      const rowUtils = within(row);

      fireEvent.click(rowUtils.getByLabelText('Edit locale'));
      fireEvent.click(screen.getByText('app.components.Button.cancel'));

      expect(screen.queryByText(`Edit locale`)).toBeFalsy();
    });
  });
});
