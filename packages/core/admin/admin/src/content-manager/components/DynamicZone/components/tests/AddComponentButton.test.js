import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import AddComponentButton from '../AddComponentButton';

describe('<AddComponentButton />', () => {
  const setup = (props) =>
    render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <AddComponentButton label="test" name="name" onClick={jest.fn()} {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

  it('should render the label by default', () => {
    setup();

    expect(screen.getByText(/test/)).toBeInTheDocument();
  });

  it('should render the close label if the isOpen prop is true', () => {
    setup({ isOpen: true });

    expect(screen.getByText(/Close/)).toBeInTheDocument();
  });

  it('should render the name of the field when the label is an empty string', () => {
    setup({ label: '' });

    expect(screen.getByText(/name/)).toBeInTheDocument();
  });

  it('should render a too high error if there is hasMaxError is true and the component is not open', () => {
    setup({ hasMaxError: true });

    expect(screen.getByText(/The value is too high./)).toBeInTheDocument();
  });

  it('should render a label telling the user there are X missing components if hasMinError is true and the component is not open', () => {
    setup({ hasMinError: true });

    expect(screen.getByText(/missing components/)).toBeInTheDocument();
  });

  it('should call the onClick handler when the button is clicked', () => {
    const onClick = jest.fn();

    setup({ onClick });

    screen.getByText(/test/).click();

    expect(onClick).toHaveBeenCalled();
  });

  it('should not call the onClick handler when the button is disabled', () => {
    const onClick = jest.fn();

    setup({ onClick, disabled: true });

    screen.getByText(/test/).click();

    expect(onClick).not.toHaveBeenCalled();
  });
});
