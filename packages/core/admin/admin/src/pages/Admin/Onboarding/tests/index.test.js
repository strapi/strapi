import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Onboarding from '../index';

jest.mock('../../../../hooks', () => ({
  useConfigurations: jest.fn(() => {
    return { showTutorials: true };
  }),
}));

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
      <Onboarding />
    </IntlProvider>
  </ThemeProvider>
);

describe('Onboarding', () => {
  it('should display every links', () => {
    const { getByRole } = render(App);

    fireEvent.click(getByRole('button', { name: /open help menu/i }));

    expect(getByRole('link', { name: /watch more videos/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /build a content architecture/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /add & manage content/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /manage media/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /documentation/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /cheatsheet/i })).toBeInTheDocument();
  });
});
