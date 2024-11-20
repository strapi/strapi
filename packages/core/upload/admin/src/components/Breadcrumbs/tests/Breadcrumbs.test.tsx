// TODO: find a better naming convention for the file that was an index file before
import { DesignSystemProvider } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { Breadcrumbs } from '../Breadcrumbs';

import type { BreadcrumbsProps } from '../Breadcrumbs';

jest.mock('../../../hooks/useFolderStructure');

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

const setup = (props: Partial<BreadcrumbsProps>) => ({
  user: userEvent.setup(),
  ...renderRTL(
    <Breadcrumbs
      breadcrumbs={defaultBreadcrumbs as BreadcrumbsProps['breadcrumbs']}
      label="Navigation"
      {...props}
    />,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <IntlProvider locale="en" messages={{}}>
              <DesignSystemProvider>{children}</DesignSystemProvider>
            </IntlProvider>
          </MemoryRouter>
        </QueryClientProvider>
      ),
    }
  ),
});

describe('Media Library | Breadcrumbs', () => {
  test('should render and match snapshot', () => {
    const { container, getByText, getByLabelText } = setup({ currentFolderId: 22 });
    const nav = getByLabelText('Navigation');
    expect(nav).toBeInTheDocument();
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
