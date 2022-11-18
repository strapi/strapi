import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { TextCell } from '../TextCell';

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <TextCell {...props} />
  </ThemeProvider>
);

const setup = (props) => render(<ComponentFixture {...props} />);

describe('TableList | TextCell', () => {
  it('should render content', () => {
    const { getByText } = setup({ content: 'michka' });

    expect(getByText('michka')).toBeInTheDocument();
  });

  it('should render a default content', () => {
    const { getByText } = setup();

    expect(getByText('-')).toBeInTheDocument();
  });
});
