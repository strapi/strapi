import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import GlobalStyle from '../../../../../components/GlobalStyle';

import ComponentCard from '../ComponentCard';

describe('ComponentCard', () => {
  const setup = (props) =>
    render(
      <ThemeProvider theme={lightTheme}>
        <ComponentCard {...props}>test</ComponentCard>
        <GlobalStyle />
      </ThemeProvider>
    );

  it('should render default icon if not icon is passed', () => {
    const { getByTestId } = setup();
    expect(getByTestId('component-card-icon-default')).toBeInTheDocument();
  });

  it('should render the passed icon', () => {
    const { getByTestId } = setup({ icon: 'Calendar' });
    expect(getByTestId('component-card-icon')).toBeInTheDocument();
  });

  it('should call the onClick handler when passed', () => {
    const onClick = jest.fn();
    const { getByText } = setup({ onClick });
    fireEvent.click(getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });
});
