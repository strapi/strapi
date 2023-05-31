import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { act, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { NotificationsProvider } from '@strapi/helper-plugin';

import DeleteButton from '../index';

function ComponentToTest(props) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={() => {}}>
          <DeleteButton
            tokenType="api-token"
            tokenName="test"
            onClickDelete={() => {}}
            {...props}
          />
        </NotificationsProvider>
      </ThemeProvider>
    </IntlProvider>
  );
}

const setup = (props = { onClickDelete: jest.fn() }) => {
  return render(<ComponentToTest {...props} />);
};

describe('DeleteButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('show confirmation delete dialog when the delete button is clicked', () => {
    const { queryByText, getByRole } = setup();
    fireEvent.click(getByRole('button', { name: 'Delete test' }));

    expect(queryByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('closes the modal when you click on Cancel button', () => {
    const { queryByText, getByText, getByRole } = setup();
    fireEvent.click(getByRole('button', { name: 'Delete test' }));

    act(() => {
      fireEvent.click(getByText('Cancel'));
    });

    expect(queryByText('Are you sure you want to delete this?')).not.toBeInTheDocument();
  });

  it('trigger the onClickDelete function when you click on the Confirm button', () => {
    const spy = jest.fn();
    const { getByRole, getByText } = setup({ onClickDelete: spy });

    fireEvent.click(getByRole('button', { name: 'Delete test' }));
    fireEvent.click(getByText('Confirm'));

    expect(spy).toBeCalledTimes(1);
  });
});
