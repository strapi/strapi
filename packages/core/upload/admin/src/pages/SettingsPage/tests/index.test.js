/**
 *
 * Tests for SettingsPage
 *
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { SettingsPage } from '../index';
import server from './utils/server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useOverlayBlocker: () => ({ lockApp: jest.fn(), unlockApp: jest.fn() }),
  useFocusWhenNavigate: jest.fn(),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{ en: {} }} textComponent="span">
      <SettingsPage />
    </IntlProvider>
  </ThemeProvider>
);

describe('Upload | SettingsPage', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', () => {
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('should display the form correctly with the initial values', async () => {
    const { getAllByTestId } = render(App);

    render(App);

    await waitFor(() => {
      const responsiveDimensions = getAllByTestId('responsiveDimensions');
      const sizeOptimizations = getAllByTestId('sizeOptimization');
      const autoOrientations = getAllByTestId('autoOrientation');
      // const saveButtons = getAllByTestId('save-button');

      expect(responsiveDimensions[0].checked).toBe(true);
      expect(autoOrientations[0].checked).toBe(true);
      expect(sizeOptimizations[0].checked).toBe(false);
      // FIXME
      // expect(saveButtons[0]).toBeDisabled();
    });
  });
});
