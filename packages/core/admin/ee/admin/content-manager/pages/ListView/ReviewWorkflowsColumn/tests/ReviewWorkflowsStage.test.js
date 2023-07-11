import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ReviewWorkflowsStageEE } from '..';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <ReviewWorkflowsStageEE {...props} />
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
