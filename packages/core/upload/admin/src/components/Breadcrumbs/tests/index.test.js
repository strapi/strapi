import React from 'react';
import { render as renderTL, screen, fireEvent, waitFor } from '@testing-library/react';
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

const setup = (props) =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <IntlProvider locale="en" messages={{}}>
          <ThemeProvider theme={lightTheme}>
            <Breadcrumbs breadcrumbs={defaultBreadcrumbs} label="Navigation" as="nav" {...props} />
          </ThemeProvider>
        </IntlProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Media Library | Breadcrumbs', () => {
  test('should render and match snapshot', () => {
    const { container } = setup({ currentFolderId: 22 });

    expect(container.querySelector('nav')).toBeInTheDocument();
    expect(screen.getByText('parent folder')).toBeInTheDocument();
    expect(screen.getByText('current folder')).toBeInTheDocument();
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  test('should store other ascendants in simple menu', async () => {
    const { getByRole } = setup({ currentFolderId: 22 });

    const simpleMenuButton = getByRole('button', { name: /get more ascendants folders/i });
    fireEvent.mouseDown(simpleMenuButton);

    await waitFor(() => {
      expect(screen.getByText('second child')).toBeInTheDocument();
    });
  });
});
