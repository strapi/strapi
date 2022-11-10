/**
 *
 * Tests for AddComponentButton
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import AddComponentButton from '../AddComponentButton';

describe('<AddComponentButton />', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton
            label="test"
            isDisabled={false}
            isOpen={false}
            name="name"
            onClick={jest.fn()}
            hasError={false}
            hasMaxError={false}
            hasMinError={false}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders and matches the snapshot when the isOpen prop is truthy', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton
            label="test"
            isOpen
            isDisabled={false}
            name="name"
            onClick={jest.fn()}
            hasError={false}
            hasMaxError={false}
            hasMinError={false}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('displays the name of the dz when the label is empty', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton
            label=""
            isOpen={false}
            isDisabled={false}
            name="name"
            onClick={jest.fn()}
            hasError={false}
            hasMaxError={false}
            hasMinError={false}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
