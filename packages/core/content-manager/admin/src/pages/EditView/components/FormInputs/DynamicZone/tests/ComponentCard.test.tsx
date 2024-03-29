import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';

import { ComponentCard, ComponentCardProps } from '../ComponentCard';

describe('ComponentCard', () => {
  const setup = (props?: Partial<ComponentCardProps>) =>
    render(
      <ThemeProvider theme={lightTheme}>
        <ComponentCard {...props}>test</ComponentCard>
      </ThemeProvider>
    );

  it('should call the onClick handler when passed', () => {
    const onClick = jest.fn();
    const { getByText } = setup({ onClick });
    fireEvent.click(getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });
});
