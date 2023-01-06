import React from 'react';
import { IntlProvider } from 'react-intl';
import { render, screen } from '@testing-library/react';

import { ThemeProvider, lightTheme, Tooltip } from '@strapi/design-system';
import Earth from '@strapi/icons/Earth';

import DynamicZoneLabel from '../DynamicZoneLabel';

const LabelAction = () => {
  return (
    <Tooltip description="i18n">
      <button aria-label="i18n" type="button">
        <Earth aria-hidden />
      </button>
    </Tooltip>
  );
};

describe('DynamicZoneLabel', () => {
  const Component = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DynamicZoneLabel label="dynamic zone" name="test" {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<Component {...props} />);

  it('should render the label by default', () => {
    setup();

    expect(screen.getByText(/dynamic zone/)).toBeInTheDocument();
  });

  it('should render the name of the zone when there is no label', () => {
    setup({ label: '' });

    expect(screen.getByText(/test/)).toBeInTheDocument();
  });

  it('should always render the amount of components no matter the value', () => {
    const { rerender } = setup({ numberOfComponents: 0 });

    expect(screen.getByText(/0/)).toBeInTheDocument();

    rerender(<Component numberOfComponents={2} />);

    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('should render an asteriks when the required prop is true', () => {
    setup({ required: true });

    expect(screen.getByText(/\*/)).toBeInTheDocument();
  });

  it('should render the labelAction when it is provided', () => {
    setup({ labelAction: <LabelAction /> });

    expect(screen.getByLabelText(/i18n/)).toBeInTheDocument();
  });

  it('should render a description if passed as a prop', () => {
    setup({
      intlDescription: {
        id: 'description',
        defaultMessage: 'description',
      },
    });

    expect(screen.getByText(/description/)).toBeInTheDocument();
  });
});
