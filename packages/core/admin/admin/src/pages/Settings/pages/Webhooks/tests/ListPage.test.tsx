import React from 'react';

import { useRBAC } from '@strapi/helper-plugin';
import { fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { mockData } from '@tests/mockData';
import { render, waitFor, server, screen } from '@tests/utils';
import { rest } from 'msw';
import { useLocation } from 'react-router-dom';

import { ListPage } from '../ListPage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
  })),
  useFocusWhenNavigate: jest.fn(),
}));

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testId="location">{location.pathname}</span>;
};

describe('Webhooks | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a loader when data is loading and then display the data', async () => {
    const { getByText, queryByText } = render(<ListPage />);

    const loadingElement = getByText('Loading content.');

    expect(loadingElement).toBeInTheDocument();

    await waitForElementToBeRemoved(() => queryByText('Loading content.'));

    await waitFor(async () => {
      expect(getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should show a loader when permissions are loading', async () => {
    // @ts-expect-error – mocking for test
    useRBAC.mockImplementationOnce(() => ({
      isLoading: true,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    const { queryByText, getByText } = render(<ListPage />);

    expect(getByText('Loading content.')).toBeInTheDocument();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());
  });

  it('should show a list of webhooks', async () => {
    const { getByText } = render(<ListPage />);

    await waitFor(() => {
      expect(getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should delete all webhooks', async () => {
    const { getByText, user, getByRole, findByText } = render(<ListPage />);
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    fireEvent.click(getByRole('checkbox', { name: 'Select all entries' }));
    fireEvent.click(getByRole('button', { name: 'Delete' }));

    await waitFor(async () => {
      expect(await findByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });

    server.use(
      rest.get('/admin/webhooks', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: [],
          })
        );
      })
    );

    await user.click(getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(getByText('No webhooks found')).toBeInTheDocument();
    });
  });

  it('should delete a single webhook', async () => {
    const { getByText, getByRole, findByText, getAllByRole, user } = render(<ListPage />);
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    const deleteButtons = getAllByRole('button', { name: /delete webhook/i });
    await user.click(deleteButtons[0]);

    await waitFor(async () => {
      expect(await findByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });

    server.use(
      rest.get('/admin/webhooks', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: [mockData.webhooks[1]],
          })
        );
      })
    );

    await user.click(getByRole('button', { name: /confirm/i }));

    await waitFor(async () => {
      expect(await findByText('http://me.io')).toBeInTheDocument();
    });
  });

  it('should disable a webhook', async () => {
    const { getByText, getAllByRole, user } = render(<ListPage />);
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    const enableSwitches = getAllByRole('switch', { name: /status/i });

    server.use(
      rest.get('/admin/webhooks', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                ...mockData.webhooks[0],
                isEnabled: false,
              },
              ...mockData.webhooks.slice(1),
            ],
          })
        );
      })
    );

    await user.click(enableSwitches[0]);

    await waitFor(async () => {
      expect(enableSwitches[0]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('should allow to create a new webhook on empty state screen by clicking on the button', async () => {
    server.use(
      rest.get('/admin/webhooks', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
          })
        );
      })
    );

    const { getByRole, findByText, user } = render(<ListPage />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <LocationDisplay />
            </>
          );
        },
      },
    });

    await findByText('No webhooks found');
    expect(screen.getByTestId('location')).not.toHaveTextContent('/create');
    await user.click(getByRole('button', { name: 'Create new webhook' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/create'));
  });
});
