import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { act, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { NotificationsProvider } from '@strapi/helper-plugin';

import DeleteButton from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

function getButton(container, name) {
  return container.querySelector(`button[name="${name}"]`);
}

function ComponentToTest(props) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={() => {}}>
          <DeleteButton tokenName="test" onClickDelete={() => {}} {...props} />
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
    const { baseElement, queryByText } = setup();
    fireEvent.click(getButton(baseElement, 'delete'));

    expect(queryByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('closes the modal when you click on Cancel button', () => {
    const { baseElement, queryByText, getByText } = setup();
    fireEvent.click(getButton(baseElement, 'delete'));

    act(() => {
      fireEvent.click(getByText('Cancel'));
    });

    expect(queryByText('Are you sure you want to delete this?')).not.toBeInTheDocument();
  });

  it('trigger the onClickDelete function when you click on the Confirm button', () => {
    const spy = jest.fn();
    const { baseElement, getByText } = setup({ onClickDelete: spy });

    fireEvent.click(getButton(baseElement, 'delete'));
    fireEvent.click(getByText('Confirm'));

    expect(spy).toBeCalledTimes(1);
  });
});
