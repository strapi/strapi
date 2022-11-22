import React from 'react';
import { StrapiAppProvider } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import PluginsInitializer from '../index';

jest.mock('../../../pages/Admin', () => () => {
  return <div>ADMIN</div>;
});

describe('ADMIN | COMPONENTS | PluginsInitializer', () => {
  it('should not crash', () => {
    const getPlugin = jest.fn();

    expect(
      render(
        <StrapiAppProvider
          plugins={{}}
          getPlugin={getPlugin}
          runHookParallel={jest.fn()}
          runHookWaterfall={jest.fn()}
          runHookSeries={jest.fn()}
          menu={[]}
          settings={{}}
        >
          <PluginsInitializer />
        </StrapiAppProvider>
      )
    );
  });
});
