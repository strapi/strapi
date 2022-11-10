/**
 *
 * Tests for DzLabel
 *
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme, Tooltip } from '@strapi/design-system';
import Earth from '@strapi/icons/Earth';
import { IntlProvider } from 'react-intl';
import styled from 'styled-components';
import DynamicZoneLabel from '../DynamicZoneLabel';

const Button = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  svg {
    width: 12px;
    height: 12px;
    fill: ${({ theme }) => theme.colors.neutral500};
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const LabelAction = () => {
  return (
    <Tooltip description="i18n">
      <Button aria-label="i18n" type="button">
        <Earth aria-hidden />
      </Button>
    </Tooltip>
  );
};

describe('DynamicZoneLabel', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <DynamicZoneLabel label="dz" name="test" numberOfComponents={1} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('displays the name of the dz when the label is empty', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <DynamicZoneLabel name="test" numberOfComponents={1} />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('displays the labelAction correctly', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <DynamicZoneLabel
            label="dz"
            name="test"
            numberOfComponents={1}
            labelAction={<LabelAction />}
          />
        </IntlProvider>
      </ThemeProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
