import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import { UseCasePage } from '../UseCasePage';

jest.mock('../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale() {},
  localeNames: { en: 'English' },
  messages: ['test'],
}));

jest.mock('../../hooks/useConfigurations', () => () => ({
  logos: {
    auth: { custom: 'customAuthLogo.png', default: 'defaultAuthLogo.png' },
  },
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  auth: {
    getUserInfo: jest.fn(() => ({
      firstname: 'Michka',
      email: 'michka@ronronscelestes.com',
    })),
  },
}));

const render = (props) => ({
  ...renderRTL(<UseCasePage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();

      return (
        <IntlProvider messages={{}} textComponent="span" locale="en">
          <ThemeProvider theme={lightTheme}>
            <Router history={history}>{children}</Router>
          </ThemeProvider>
        </IntlProvider>
      );
    },
  }),

  user: userEvent.setup(),
});

describe('Admin | UseCasePage', () => {
  it('should not show Other input if select value is not Other', async () => {
    const { queryByTestId, user } = render();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Front-end developer' }));

    expect(queryByTestId('other')).not.toBeInTheDocument();
  });

  it('should show Other input if select value is Other', async () => {
    const { queryByTestId, user } = render();

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Other' }));

    expect(queryByTestId('other')).toBeInTheDocument();
  });
});
