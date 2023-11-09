import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import * as LimitsModal from '..';

const setup = (props) => ({
  ...render(
    <LimitsModal.Root isOpen onClose={() => {}} {...props}>
      <LimitsModal.Title>Title</LimitsModal.Title>
      <LimitsModal.Body>Body</LimitsModal.Body>
    </LimitsModal.Root>,
    {
      wrapper({ children }) {
        return (
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}}>
              {children}
            </IntlProvider>
          </ThemeProvider>
        );
      },
    }
  ),

  user: userEvent.setup(),
});

describe('Admin | Settings | Review Workflow | LimitsModal', () => {
  it('should not render the modal if isOpen=false', () => {
    const { queryByText } = setup({ isOpen: false });

    expect(queryByText('Title')).not.toBeInTheDocument();
    expect(queryByText('Body')).not.toBeInTheDocument();
  });

  it('should render the modal if isOpen=true', () => {
    const { getByText } = setup();

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Body')).toBeInTheDocument();
  });

  it('should render call to action links', () => {
    const { getByText } = setup();

    expect(getByText('Learn more')).toBeInTheDocument();
    expect(getByText('Contact Sales')).toBeInTheDocument();
  });

  it('should call onClose callback when closing the modal', async () => {
    const onCloseSpy = jest.fn();
    const { getByRole, user } = setup({ onClose: onCloseSpy });

    await user.click(getByRole('button', { name: /close/i }));

    expect(onCloseSpy).toBeCalledTimes(1);
  });
});
