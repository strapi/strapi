import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import ComponentCategory from '../ComponentCategory';

describe('ComponentCategory', () => {
  const setup = (props) =>
    render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <ComponentCategory
            onAddComponent={jest.fn()}
            onToggle={jest.fn()}
            category="testing"
            {...props}
          />
        </IntlProvider>
      </ThemeProvider>
    );

  it('should render my array of components when passed and the accordion is open', () => {
    setup({
      isOpen: true,
      components: [
        {
          componentUid: 'test',
          info: {
            displayName: 'myComponent',
            icon: 'test',
          },
        },
      ],
    });

    expect(screen.getByText(/myComponent/)).toBeInTheDocument();
  });

  it('should render the category as the accordion buttons label', () => {
    setup({
      category: 'myCategory',
    });

    expect(screen.getByText(/myCategory/)).toBeInTheDocument();
  });

  it('should call the onToggle callback when the accordion trigger is pressed', () => {
    const onToggle = jest.fn();
    setup({
      onToggle,
    });

    fireEvent.click(screen.getByText(/testing/));

    expect(onToggle).toHaveBeenCalledWith('testing');
  });

  it('should call onAddComponent with the componentUid when a ComponentCard is clicked', () => {
    const onAddComponent = jest.fn();
    setup({
      isOpen: true,
      onAddComponent,
      components: [
        {
          componentUid: 'test',
          info: {
            displayName: 'myComponent',
            icon: 'test',
          },
        },
      ],
    });

    fireEvent.click(screen.getByText(/myComponent/));

    expect(onAddComponent).toHaveBeenCalledWith('test');
  });
});
