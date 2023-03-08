import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import CreateAction from '..';

const onClickSpy = jest.fn();

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <CreateAction onClick={onClickSpy} {...props} />
    </IntlProvider>
  </ThemeProvider>
);

function setup(props) {
  return render(<ComponentFixture {...props} />);
}

describe('<CreateAction />', () => {
  test('Does render', () => {
    const { queryByText } = setup();

    expect(queryByText('Invite new user')).toBeInTheDocument();
  });

  test('Calls onClick callback', () => {
    const { getByRole } = setup();

    fireEvent.click(getByRole('button'));

    expect(onClickSpy).toBeCalledTimes(1);
  });
});
