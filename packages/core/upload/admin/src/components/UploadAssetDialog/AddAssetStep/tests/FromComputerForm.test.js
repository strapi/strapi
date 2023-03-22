import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { TrackingProvider } from '@strapi/helper-plugin';
import { IntlProvider } from 'react-intl';
import { FromComputerForm } from '../FromComputerForm';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
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
