import React from 'react';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import { AddComponentButton } from '../AddComponentButton';

describe('<AddComponentButton />', () => {
  const render = (props) => ({
    ...renderRTL(
      <AddComponentButton onClick={jest.fn()} {...props}>
        test
      </AddComponentButton>,
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

  it('should render the label by default', () => {
    const { getByRole } = render();

    expect(getByRole('button', { name: 'test' })).toBeInTheDocument();
  });

  it('should call the onClick handler when the button is clicked', async () => {
    const onClick = jest.fn();

    const { getByRole, user } = render({ onClick });

    await user.click(getByRole('button', { name: 'test' }));

    expect(onClick).toHaveBeenCalled();
  });

  it('should not call the onClick handler when the button is disabled', async () => {
    const onClick = jest.fn();

    const { getByRole, user } = render({ onClick, isDisabled: true });

    await expect(() => user.click(getByRole('button', { name: 'test' }))).rejects.toThrow(
      /pointer-events: none/
    );

    expect(onClick).not.toHaveBeenCalled();
  });
});
