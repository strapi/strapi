import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { CreateActionCE } from '..';

const onClickSpy = jest.fn();

const ComponentFixture = (props) => (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}}>
      <CreateActionCE onClick={onClickSpy} {...props} />
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
