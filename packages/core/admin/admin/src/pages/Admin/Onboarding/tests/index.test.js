import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  it('renders and matches the snapshot', async () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchSnapshot();
  });

  it('should open links when button is clicked', () => {
    render(App);

    fireEvent.click(document.querySelector('#onboarding'));
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });
});
