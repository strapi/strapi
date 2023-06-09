import React from 'react';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import { ComponentPicker } from '../ComponentPicker';

import { dynamicComponentsByCategory } from './fixtures';

describe('ComponentPicker', () => {
  const Component = (props) => (
    <ComponentPicker
      isOpen
      onClickAddComponent={jest.fn()}
      dynamicComponentsByCategory={dynamicComponentsByCategory}
      {...props}
    />
  );

  const render = (props) => ({
    ...renderRTL(<Component {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }),
    user: userEvent.setup(),
  });

  it('should by default give me the instruction to Pick one Component', () => {
    const { getByText } = render();

    expect(getByText(/Pick one component/)).toBeInTheDocument();
  });

  it('should render null if isOpen is false', () => {
    const { queryByText } = render({ isOpen: false });

    expect(queryByText(/Pick one component/)).not.toBeInTheDocument();
  });

  it('should render the category names by default', () => {
    const { getByText } = render({ components: ['component1', 'component2'] });

    expect(getByText(/myComponents/)).toBeInTheDocument();
  });

  it('should open the first category of components when isOpen changes to true from false', () => {
    const { rerender, getByRole, queryByRole } = render({
      isOpen: false,
    });

    rerender(<Component isOpen components={['component1', 'component2', 'component3']} />);

    expect(getByRole('button', { name: /component1/ })).toBeInTheDocument();
    expect(queryByRole('button', { name: /component3/ })).not.toBeInTheDocument();
  });

  it('should call onClickAddComponent with the componentUid when a Component is clicked', async () => {
    const onClickAddComponent = jest.fn();
    const { user, getByRole } = render({
      components: ['component1', 'component2'],
      onClickAddComponent,
    });

    await user.click(getByRole('button', { name: /component1/ }));

    expect(onClickAddComponent).toHaveBeenCalledWith('component1');
  });
});
