import React from 'react';
import { render } from '@testing-library/react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { AddStage } from '../AddStage';

const ComponentFixture = () => (
  <ThemeProvider theme={lightTheme}>
    <AddStage>Add stage</AddStage>
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('Admin | Settings | Review Workflow | AddStage', () => {
  it('should render a list of stages', () => {
    const { container, getByText } = setup();

    expect(container).toMatchSnapshot();
    expect(getByText('Add stage')).toBeInTheDocument();
  });
});
