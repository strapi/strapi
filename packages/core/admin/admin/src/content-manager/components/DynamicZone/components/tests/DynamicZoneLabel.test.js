import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderRTL } from '@testing-library/react';

import { ThemeProvider, lightTheme, Tooltip } from '@strapi/design-system';
import { Earth } from '@strapi/icons';

import { DynamicZoneLabel } from '../DynamicZoneLabel';

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

  const render = (props) => renderRTL(<Component {...props} />);

  it('should render the label by default', () => {
    const { getByText } = render();

    expect(getByText(/dynamic zone/)).toBeInTheDocument();
  });

  it('should render the name of the zone when there is no label', () => {
    const { getByText } = render({ label: '' });

    expect(getByText(/test/)).toBeInTheDocument();
  });

  it('should always render the amount of components no matter the value', () => {
    const { rerender, getByText } = render({ numberOfComponents: 0 });

    expect(getByText(/0/)).toBeInTheDocument();

    rerender(<Component numberOfComponents={2} />);

    expect(getByText(/2/)).toBeInTheDocument();
  });

  it('should render an asteriks when the required prop is true', () => {
    const { getByText } = render({ required: true });

    expect(getByText(/\*/)).toBeInTheDocument();
  });

  it('should render the labelAction when it is provided', () => {
    const { getByLabelText } = render({ labelAction: <LabelAction /> });

    expect(getByLabelText(/i18n/)).toBeInTheDocument();
  });

  it('should render a description if passed as a prop', () => {
    const { getByText } = render({
      intlDescription: {
        id: 'description',
        defaultMessage: 'description',
      },
    });

    expect(getByText(/description/)).toBeInTheDocument();
  });
});
