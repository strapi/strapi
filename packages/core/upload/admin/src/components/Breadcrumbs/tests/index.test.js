import React from 'react';
import { render as renderTL, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Breadcrumbs } from '../index';
import en from '../../../translations/en.json';

jest.mock('../../../hooks/useFolderStructure');

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useQueryParams: jest.fn().mockReturnValue([{ query: { folder: 22 } }]),
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id]) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const breadcrumbs = [
  {
    href: '/',
    id: null,
    label: 'Media Library',
  },
  [],
  { href: '/', id: 21, label: 'parent folder' },
  { id: 22, label: 'current folder' },
];

const setup = props =>
  renderTL(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
          <Breadcrumbs {...props} breadcrumbs={breadcrumbs} as="nav" />
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Media Library | Breadcrumbs', () => {
  test('should render and match snapshot', () => {
    const { container } = setup();

    expect(container.querySelector('nav')).toBeInTheDocument();
    expect(screen.getByText('parent folder')).toBeInTheDocument();
    expect(screen.getByText('current folder')).toBeInTheDocument();
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  test('should store other ascendants in simple menu', async () => {
    const { getByRole } = setup();

    const simpleMenuButton = getByRole('button', { name: /get more ascendants folders/i });
    fireEvent.mouseDown(simpleMenuButton);

    await waitFor(() => {
      expect(screen.getByText('second child')).toBeInTheDocument();
    });
  });
});
