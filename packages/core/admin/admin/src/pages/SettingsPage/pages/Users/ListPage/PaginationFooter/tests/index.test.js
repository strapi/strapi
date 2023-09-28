import React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import { TrackingProvider } from '@strapi/helper-plugin';
import { act, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import Theme from '../../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../../components/ThemeToggleProvider';
import PaginationFooter from '../index';

const setup = (pagination) => {
  const router = createMemoryRouter([
    { path: '/settings/user', element: <PaginationFooter pagination={pagination} /> },
  ]);

  return {
    ...render(
      <TrackingProvider>
        <IntlProvider messages={{}} textComponent="span" locale="en" defaultLocale="en">
          <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
            <Theme>
              <RouterProvider router={router} />
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </TrackingProvider>
    ),
    router,
  };
};

describe('DynamicTable', () => {
  it('renders and matches the snapshot', async () => {
    const pagination = { pageCount: 2 };
    const { container, router } = setup(pagination);

    await act(() => router.navigate('/settings/user?pageSize=10&page=1&sort=firstname'));

    expect(container).toMatchSnapshot();
  });
});
