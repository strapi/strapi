import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';

import { AdminUsersFilter } from '../AdminUsersFilter';

const server = setupServer(
  rest.get('*/admin/users', (req, res, ctx) => {
    const mockUsers = [
      { id: 1, firstname: 'John', lastname: 'Doe' },
      { id: 2, firstname: 'Kai', lastname: 'Doe' },
    ];

    return res(
      ctx.json({
        data: {
          results: mockUsers,
        },
      })
    );
  })
);

const queryClient = new QueryClient();

const setup = (props) => {
  return {
    ...render(<AdminUsersFilter {...props} />, {
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

describe('AdminUsersFilter', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it('should render all the options fetched from the API', async () => {
    const mockOnChange = jest.fn();
    const { getByText, user, getByRole } = setup({ onChange: mockOnChange });

    await user.click(getByRole('combobox'));

    await waitFor(() => {
      expect(getByText('John Doe')).toBeInTheDocument();
      expect(getByText('Kai Doe')).toBeInTheDocument();
    });
  });

  it('should call the onChange function with the selected value', async () => {
    const mockOnChange = jest.fn();
    const { getByText, user, getByRole } = setup({ onChange: mockOnChange });

    await user.click(getByRole('combobox'));

    await waitFor(() => expect(getByText('John Doe')).toBeInTheDocument());

    const option = getByText('John Doe');

    await user.click(option);

    expect(mockOnChange).toHaveBeenCalledWith('1');
  });
});
