import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { ComponentCategory, ComponentCategoryProps } from '../ComponentCategory';

describe('ComponentCategory', () => {
  const render = (props?: Partial<ComponentCategoryProps>) => ({
    ...renderRTL(
      <ComponentCategory
        onAddComponent={jest.fn()}
        onToggle={jest.fn()}
        category="testing"
        {...props}
      />,
      {
        wrapper: ({ children }) => (
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              {children}
            </IntlProvider>
          </ThemeProvider>
        ),
      }
    ),
    user: userEvent.setup(),
  });

  it('should render my array of components when passed and the accordion is open', () => {
    const { getByRole } = render({
      isOpen: true,
      components: [
        {
          componentUid: 'test.test',
          info: {
            displayName: 'myComponent',
            icon: 'test',
          },
          attributes: {},
        },
      ],
    });

    expect(getByRole('button', { name: /myComponent/ })).toBeInTheDocument();
  });

  it('should render the category as the accordion buttons label', () => {
    const { getByText } = render({
      category: 'myCategory',
    });

    expect(getByText(/myCategory/)).toBeInTheDocument();
  });

  it('should call the onToggle callback when the accordion trigger is pressed', async () => {
    const onToggle = jest.fn();
    const { getByRole, user } = render({
      onToggle,
    });

    await user.click(getByRole('button', { name: /testing/ }));

    expect(onToggle).toHaveBeenCalledWith('testing');
  });

  it('should call onAddComponent with the componentUid when a ComponentCard is clicked', async () => {
    const onAddComponent = jest.fn();
    const { getByRole, user } = render({
      isOpen: true,
      onAddComponent,
      components: [
        {
          componentUid: 'test.test',
          info: {
            displayName: 'myComponent',
            icon: 'test',
          },
          attributes: {},
        },
      ],
    });

    await user.click(getByRole('button', { name: /myComponent/ }));

    expect(onAddComponent).toHaveBeenCalledWith('test.test');
  });
});
