import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
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
        <DesignSystemProvider>
          <FromComputerForm onClose={jest.fn()} onAddAssets={jest.fn()} />
        </DesignSystemProvider>
      </IntlProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
