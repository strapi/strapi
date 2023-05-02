import React from 'react';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Breadcrumbs } from '../index';

jest.mock('../../../hooks/useFolderStructure');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: { folder: 22 } }]),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const defaultBreadcrumbs = [
  {
    href: '/',
    id: null,
    label: 'Media Library',
  },
  [],
  { href: '/', id: 21, label: 'parent folder' },
  { id: 22, label: 'current folder' },
];

const setup = (props) => ({
  user: userEvent.setup(),
  ...renderRTL(
    <Breadcrumbs breadcrumbs={defaultBreadcrumbs} label="Navigation" as="nav" {...props} />,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <IntlProvider locale="en" messages={{}}>
              <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
            </IntlProvider>
          </MemoryRouter>
        </QueryClientProvider>
      ),
    }
  ),
});

describe('Media Library | Breadcrumbs', () => {
  test('should render and match snapshot', () => {
    const { container, getByText } = setup({ currentFolderId: 22 });

    expect(container.querySelector('nav')).toBeInTheDocument();
    expect(getByText('parent folder')).toBeInTheDocument();
    expect(getByText('current folder')).toBeInTheDocument();
    expect(getByText('Media Library')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  test('should store other ascendants in simple menu', async () => {
    const { user, getByRole, getByText } = setup({ currentFolderId: 22 });

    const simpleMenuButton = getByRole('button', { name: /ascendants folders/i });
    await user.click(simpleMenuButton);

    expect(getByText('second child')).toBeInTheDocument();
  });
});
