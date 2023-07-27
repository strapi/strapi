import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ReviewWorkflowsAssigneeEE } from '..';

const setup = (props) =>
  render(<ReviewWorkflowsAssigneeEE {...props} />, {
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

describe('Content-Manager | List View | ReviewWorkflowsAssignee', () => {
  test('will use displayname over first and last name', () => {
    const { getByText } = setup({ user: { firstname: 'Kai', username: 'Display Name' } });

    expect(getByText('Display Name')).toBeInTheDocument();
  });

  test('render assignee name', () => {
    const { getByText } = setup({ user: { firstname: 'Kai', lastname: 'Doe' } });

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });
});
