import React from 'react';
import { StrapiProvider } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import PluginsInitializer from '../index';

jest.mock('../../../pages/Admin', () => () => <div>ADMIN</div>);

describe('ADMIN | COMPONENTS | PluginsInitializer', () => {
  it('should not crash', () => {
    expect(
      render(
        <StrapiProvider strapi={{ plugins: {} }}>
          <PluginsInitializer />
        </StrapiProvider>
      )
    );
  });
});
