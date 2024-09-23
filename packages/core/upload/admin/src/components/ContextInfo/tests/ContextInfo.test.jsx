import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';

import { ContextInfo } from '../index';

describe('ContextInfo', () => {
  it('renders', () => {
    const { container } = render(
      <DesignSystemProvider>
        <ContextInfo
          blocks={[
            {
              label: 'Label 1',
              value: 'value1',
            },

            {
              label: 'Label 2',
              value: 'value2',
            },

            {
              label: 'Label 3',
              value: 'value3',
            },
          ]}
        />
      </DesignSystemProvider>
    );

    expect(container).toMatchSnapshot();
  });
});
