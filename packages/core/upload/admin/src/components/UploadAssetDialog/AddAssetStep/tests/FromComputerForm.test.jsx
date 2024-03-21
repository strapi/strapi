import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderTL } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { FromComputerForm } from '../FromComputerForm';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  getFetchClient: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));

describe('FromComputerForm', () => {
  it('snapshots the component', async () => {
    const { container } = renderTL(
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <FromComputerForm onClose={jest.fn()} onAddAssets={jest.fn()} />
        </ThemeProvider>
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
