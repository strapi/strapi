import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ReviewWorkflowsAssigneeEE } from '..';

const USER_FIXTURE = { firstname: 'Kai', lastname: 'Doe' };

const setup = ({ user, ...props } = { user: USER_FIXTURE }) =>
  render(<ReviewWorkflowsAssigneeEE user={user} {...props} />, {
    wrapper({ children }) {
      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        </ThemeProvider>
      );
    },
  });

describe('Content Manager | List View | ReviewWorkflowsAssignee', () => {
  test('render assignee name', () => {
    const { getByText } = setup();

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });

  test('will use username over first and last name', () => {
    const username = 'Display Name';
    const { getByText } = setup({ user: { ...USER_FIXTURE, username } });

    expect(getByText(username)).toBeInTheDocument();
  });
});
