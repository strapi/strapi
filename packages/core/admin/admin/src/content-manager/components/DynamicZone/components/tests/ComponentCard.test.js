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

  it('should render children by default', () => {
    const { getByTestId, getByText } = setup();
    expect(getByText('test')).toBeInTheDocument();
    expect(getByTestId('component-card-icon')).toMatchSnapshot();
  });

  it('should render a valid icon when passed its name', () => {
    const { getByTestId } = setup({ icon: 'fa-camera' });
    expect(getByTestId('component-card-icon')).toMatchSnapshot();
  });

  it('should call the onClick handler when passed', () => {
    const onClick = jest.fn();
    const { getByText } = setup({ onClick });
    fireEvent.click(getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });
});
