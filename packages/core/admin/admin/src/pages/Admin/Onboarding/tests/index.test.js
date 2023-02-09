import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Onboarding from '../index';

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
  ])('should display %s link', (link) => {
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: new RegExp(link, 'i') })).toBeInTheDocument();
  });
});
