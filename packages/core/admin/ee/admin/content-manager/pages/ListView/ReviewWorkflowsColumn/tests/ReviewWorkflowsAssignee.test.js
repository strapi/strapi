import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ReviewWorkflowsAssigneeEE } from '..';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <ReviewWorkflowsAssigneeEE {...props} />
    </IntlProvider>
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('DynamicTable | ReviewWorkflowsAssignee', () => {
  test('will use displayname over first and last name', () => {
    const displayname = 'Display Name';
    const { getByText } = setup({ displayname });

    expect(getByText(displayname)).toBeInTheDocument();
  });
  test('render assignee name', () => {
    const { getByText } = setup({ firstname: 'Kai', lastname: 'Doe' });

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });
});
