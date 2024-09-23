import { fireEvent, getByText, waitForElementToBeRemoved } from '@testing-library/react';
import { mockData } from '@tests/mockData';
import { render, waitFor, server, screen } from '@tests/utils';
import { rest } from 'msw';
import { useLocation } from 'react-router-dom';

import { ListPage } from '../ListPage';

jest.mock('../../../../../hooks/useRBAC');

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
      expect(await findByText('Are you sure?')).toBeInTheDocument();
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
    const { findByText, user, findByRole, findAllByRole, queryByText } = render(<ListPage />);

    await findByText('http:://strapi.io');

    const deleteButtons = await findAllByRole('button', { name: /delete webhook/i });
    await user.click(deleteButtons[0]);

    await findByText('Are you sure?');

    server.use(
      rest.get('/admin/webhooks', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: [mockData.webhooks[1]],
          })
        );
      })
    );

    const confirmButton = await findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    await findByText('http://me.io');

    await waitFor(() => expect(queryByText('http:://strapi.io')).not.toBeInTheDocument());
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

    const { getAllByRole, findByText, user } = render(<ListPage />, {
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
    await user.click(getAllByRole('link', { name: 'Create new webhook' })[1]);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/create'));
  });
});
