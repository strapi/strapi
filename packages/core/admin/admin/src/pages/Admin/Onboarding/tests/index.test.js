import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { useAppInfo } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Onboarding from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useAppInfo: jest.fn(() => ({ communityEdition: true })),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Onboarding />
    </IntlProvider>
  </ThemeProvider>
);

describe('Onboarding', () => {
  test.each([
    'watch more videos',
    'build a content architecture',
    'add & manage content',
    'manage media',
    'documentation',
    'cheatsheet',
    'get help',
  ])('should display %s link', async (link) => {
    const user = userEvent.setup();
    const { getByRole } = render(App);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });

  test('should display discord link for CE edition', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(App);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
  });

  test('should display support link for EE edition', async () => {
    useAppInfo.mockImplementation(() => ({ communityEdition: false }));
    const user = userEvent.setup();
    const { getByRole } = render(App);

    await user.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });
});
