import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';

import { StageFilter } from '../StageFilter';

const server = setupServer(
  rest.get('*/admin/review-workflows/workflows', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: 1,
            stages: [
              {
                id: 1,
                name: 'To Review',
                color: '#FFFFFF',
              },
            ],
          },
        ],
      })
    );
  })
);

const queryClient = new QueryClient();

const setup = (props) => {
  return {
    ...render(<StageFilter uid="api::address.address" onChange={() => {}} {...props} />, {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en" messages={{}} defaultLocale="en">
              {children}
            </IntlProvider>
          </QueryClientProvider>
        </ThemeProvider>
      ),
    }),
    user: userEvent.setup(),
  };
};

describe('Content-Manger | List View | Filter | StageFilter', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it('should display stages', async () => {
    const { getByText, user, getByRole } = setup();

    await user.click(getByRole('combobox'));

    await waitFor(() => {
      expect(getByText('To Review')).toBeInTheDocument();
    });
  });

  it('should use the stage name as filter value', async () => {
    const spy = jest.fn();
    const { getByText, user, getByRole } = setup({ onChange: spy });

    await user.click(getByRole('combobox'));
    await user.click(getByText('To Review'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('To Review');
    });
  });
});
