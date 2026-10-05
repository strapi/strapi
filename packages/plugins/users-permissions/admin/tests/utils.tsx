/* eslint-disable check-file/filename-naming-convention */

import { type ReactNode, type ComponentType } from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/strapi/admin';
import { render as renderRTL, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

export { waitFor, screen } from '@testing-library/react';

/** Renders settings pages with the providers used by users-permissions. */
export const render = (
  ui: ReactNode,
  options: { renderOptions?: { wrapper?: ComponentType<{ children: ReactNode }> } } = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = options.renderOptions?.wrapper ?? (({ children }) => children);

  return {
    ...renderRTL(
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <QueryClientProvider client={client}>
            <NotificationsProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Wrapper>{ui}</Wrapper>
              </MemoryRouter>
            </NotificationsProvider>
          </QueryClientProvider>
        </DesignSystemProvider>
      </IntlProvider>
    ),
    user: userEvent.setup(),
  };
};
