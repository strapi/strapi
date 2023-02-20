import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { act, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { NotificationsProvider } from '@strapi/helper-plugin';

import DeleteTokenDialog from '../index';

function ComponentToTest(props) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={() => {}}>
          <DeleteTokenDialog onClose={() => {}} onConfirm={() => {}} isOpen {...props} />
        </NotificationsProvider>
      </ThemeProvider>
    </IntlProvider>
  );
}

const setup = (props = { onClose: jest.fn(), onConfirm: jest.fn() }) => {
  return render(<ComponentToTest {...props} />);
};

describe('DeleteTokenDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders and matches the snapshot', () => {
    const { baseElement } = setup();
    expect(baseElement).toMatchSnapshot();
  });

  it('show confirmation delete dialog', () => {
    const { queryByText } = setup();

    expect(queryByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('closes the modal', () => {
    const spy = jest.fn();
    const { getByText } = setup({ onClose: spy });

    act(() => {
      fireEvent.click(getByText('Cancel'));
    });

    expect(spy).toBeCalledTimes(1);
  });

  it('confirm the choice in the modal', () => {
    const spy = jest.fn();
    const { getByText } = setup({ onConfirm: spy });

    act(() => {
      fireEvent.click(getByText('Confirm'));
    });

    expect(spy).toBeCalledTimes(1);
  });
});
