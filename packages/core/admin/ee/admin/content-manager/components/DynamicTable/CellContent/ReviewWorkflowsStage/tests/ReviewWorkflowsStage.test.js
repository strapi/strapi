import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import ReviewWorkflowsStage from '..';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <ReviewWorkflowsStage {...props} />
    </IntlProvider>
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('DynamicTable | ReviewWorkflowsStage', () => {
  test('render stage name', () => {
    const { getByText } = setup({ color: '#4945FF', name: 'reviewed' });

    expect(getByText('reviewed')).toBeInTheDocument();
  });
});
