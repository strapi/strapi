import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { render as renderRTL, waitFor, server, screen } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { AssigneeSelect } from '../AssigneeSelect';

// Mock the content manager hook more comprehensively
jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn(),
}));

describe('AssigneeSelect', () => {
  beforeEach(() => {
    // Reset the mock implementation before each test
    jest.mocked(unstable_useDocument).mockReturnValue({
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
        },
      },
      isLoading: false,
      components: {},
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
    });
  });
  const render = () =>
    renderRTL(<AssigneeSelect isCompact={false} />, {
      renderOptions: {
        wrapper: ({ children }) => {
          return (
            <Routes>
              <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
            </Routes>
          );
        },
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/12345'],
    });

  it('renders a select with users, none is selected', async () => {
    const { user } = render();

    await waitFor(() => expect(screen.queryByText('John Doe')).not.toBeInTheDocument());

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.queryByText('Loading content...')).not.toBeInTheDocument());

    await screen.findByText('John Doe');
  });

  it('loads more users when the combobox reaches the end of the list', async () => {
    const originalIntersectionObserver = window.IntersectionObserver;
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollHeight'
    );
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientHeight'
    );
    const requestedPageSizes: string[] = [];
    let intersections = 0;

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 10,
    });

    window.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly scrollMargin = '';
      readonly thresholds = [];

      constructor(private callback: IntersectionObserverCallback) {}

      disconnect = jest.fn();
      takeRecords = jest.fn(() => []);
      unobserve = jest.fn();

      observe = (element: Element) => {
        if (intersections === 0) {
          intersections += 1;
          this.callback(
            [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
            this
          );
        }
      };
    };

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        requestedPageSizes.push(req.url.searchParams.get('pageSize') ?? '');

        return res(
          ctx.json({
            data: {
              results: [{ id: 1, firstname: 'John', lastname: 'Doe', roles: [] }],
              pagination: {
                page: 1,
                pageCount: 2,
              },
            },
          })
        );
      })
    );

    try {
      const { user } = render();

      await waitFor(() => expect(requestedPageSizes).toContain('10'));
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => expect(requestedPageSizes).toContain('20'));
    } finally {
      window.IntersectionObserver = originalIntersectionObserver;

      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      }

      if (originalClientHeight) {
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
      }
    }
  });

  it('searches admin users with filters that support split display names', async () => {
    let latestSearchParams: URLSearchParams | undefined;

    jest.mocked(unstable_useDocument).mockReturnValue({
      components: {},
      isLoading: false,
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: null,
      },
    });

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        latestSearchParams = req.url.searchParams;

        return res(
          ctx.json({
            data: {
              results: [{ id: 3, firstname: 'Assignee', lastname: '03', roles: [] }],
              pagination: {
                page: 1,
                pageCount: 1,
              },
            },
          })
        );
      })
    );

    const { user } = render();

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'Assignee 3');

    await waitFor(() =>
      expect(latestSearchParams?.get('filters[$or][4][$and][0][firstname][$containsi]')).toBe(
        'Assignee'
      )
    );
    expect(latestSearchParams?.get('filters[$or][4][$and][1][lastname][$containsi]')).toBe('3');
    expect(latestSearchParams?.has('_q')).toBe(false);
  });

  it('keeps the current assignee in the options when they are not in the loaded users', async () => {
    jest.mocked(unstable_useDocument).mockReturnValue({
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: {
          id: 99,
          firstname: 'Assigned',
          lastname: 'Outside',
        },
      },
      isLoading: false,
      components: {},
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
    });

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              results: [{ id: 1, firstname: 'John', lastname: 'Doe', roles: [] }],
              pagination: {
                page: 1,
                pageCount: 1,
              },
            },
          })
        );
      })
    );

    const { user } = render();

    await waitFor(() => expect(screen.queryByText('Assigned Outside')).not.toBeInTheDocument());
    await user.click(screen.getByRole('combobox'));

    await screen.findByText('Assigned Outside');
  });

  it.skip('renders a select with users, first user is selected', async () => {
    render();

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('John Doe'));
  });

  it('renders a disabled select when there are no users to select', async () => {
    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: {
              results: [],
            },
          })
        );
      })
    );

    render();

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
  });

  it('renders an error message, when fetching user fails', async () => {
    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        return res.once(
          ctx.status(500),
          ctx.json({
            data: {
              error: {
                message: 'Error message',
              },
            },
          })
        );
      })
    );

    render();

    await screen.findByText('An error occurred while fetching users');

    console.error = origConsoleError;
  });

  it('renders an error message, when the assignee update fails', async () => {
    jest.mocked(unstable_useDocument).mockReturnValue({
      components: {},
      isLoading: false,
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: null,
      },
    });

    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      rest.put(
        '/review-workflows/content-manager/collection-types/:contentType/:id/assignee',
        (req, res, ctx) => {
          return res.once(
            ctx.status(500),
            ctx.json({
              error: {
                message: 'Server side error message',
              },
            })
          );
        }
      )
    );

    const { user } = render();

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.queryByText('Loading content...')).not.toBeInTheDocument());
    await user.click(screen.getByText('John Doe'));

    await screen.findByText('Server side error message');

    console.error = origConsoleError;
  });
});
