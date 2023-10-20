import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import { UseCasePage } from '../UseCasePage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  auth: {
    get: jest.fn(() => ({
      firstname: 'Michka',
      email: 'michka@ronronscelestes.com',
    })),
  },
}));

const history = createMemoryHistory();

const App = (
  <IntlProvider messages={{}} textComponent="span" locale="en">
    <ThemeProvider theme={lightTheme}>
      <Router history={history}>
        <UseCasePage />
      </Router>
    </ThemeProvider>
  </IntlProvider>
);

describe('Admin | UseCasePage', () => {
  it('should not show Other input if select value is not Other', async () => {
    const { queryByTestId } = render(App);
    const user = userEvent.setup();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Front-end developer' }));

    expect(queryByTestId('other')).not.toBeInTheDocument();
  });

  it('should show Other input if select value is Other', async () => {
    const { getByTestId } = render(App);
    const user = userEvent.setup();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Other' }));

    expect(getByTestId('other')).toBeInTheDocument();
  });
});
