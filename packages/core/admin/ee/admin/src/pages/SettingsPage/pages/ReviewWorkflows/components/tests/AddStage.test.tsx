import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';

import { AddStage } from '../AddStage';

const ComponentFixture = () => (
  <ThemeProvider theme={lightTheme}>
    <AddStage>Add stage</AddStage>
  </ThemeProvider>
);

const setup = () => render(<ComponentFixture />);

describe('Admin | Settings | Review Workflow | AddStage', () => {
  it('should render a list of stages', () => {
    const { container, getByText } = setup();

    expect(container).toMatchSnapshot();
    expect(getByText('Add stage')).toBeInTheDocument();
  });
});
