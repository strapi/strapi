import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider } from '@strapi/helper-plugin';
import { render as renderTL } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { FromComputerForm } from '../FromComputerForm';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  getFetchClient: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));

describe('FromComputerForm', () => {
  it('snapshots the component', async () => {
    const { container } = renderTL(
      <IntlProvider locale="en" messages={{}}>
        <TrackingProvider>
          <ThemeProvider theme={lightTheme}>
            <FromComputerForm onClose={jest.fn()} onAddAssets={jest.fn()} />
          </ThemeProvider>
        </TrackingProvider>
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
