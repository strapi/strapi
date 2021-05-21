import React from 'react';
import { StrapiAppProvider } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import PluginsInitializer from '../index';

jest.mock('../../../pages/Admin', () => () => <div>ADMIN</div>);
jest.mock('../../ReleaseNotification', () => () => null);

describe('ADMIN | COMPONENTS | PluginsInitializer', () => {
  it('should not crash', () => {
    const getPlugin = jest.fn();

    expect(
      render(
        <StrapiAppProvider plugins={{}} getPlugin={getPlugin}>
          <PluginsInitializer />
        </StrapiAppProvider>
      )
    );
  });
});
