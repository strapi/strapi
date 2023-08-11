import React from 'react';
import { DesignSystemProvider } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <DesignSystemProvider locale="en">
          <IntlProvider messages={{}} textComponent="span" locale="en">
            <main>
              <Story />
            </main>
          </IntlProvider>
        </DesignSystemProvider>
      </MemoryRouter>
    ),
  ],
};

export default preview;
