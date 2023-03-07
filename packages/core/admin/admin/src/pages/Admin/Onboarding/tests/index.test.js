import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useAppInfos } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Onboarding from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useAppInfos: jest.fn(() => ({ communityEdition: true })),
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
  ])('should display %s link', (link) => {
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });

  test('should display discord link for CE edition', () => {
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://discord.strapi.io'
    );
  });

  test('should display support link for EE edition', () => {
    useAppInfos.mockImplementation(() => ({ communityEdition: false }));
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /get help/i })).toHaveAttribute(
      'href',
      'https://support.strapi.io/support/home'
    );
  });
});
