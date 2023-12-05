import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { InputUID, InputUIDProps } from '../InputUID';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(() => ({
    modifiedData: {
      target: 'source-string',
    },
    initialData: {
      name: 'initial-data',
    },
  })),
}));

const server = setupServer(
  rest.post('*/uid/generate', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.json({
        data: body?.data?.target ?? 'regenerated',
      })
    );
  }),

  rest.post('*/uid/check-availability', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.json({
        isAvailable: body?.value === 'available',
      })
    );
  })
);

const render = (props?: Partial<InputUIDProps>) => {
  return {
    ...renderRTL(
      <InputUID
        // @ts-expect-error – Mock attribute
        attribute={{ targetField: 'target', required: true }}
        contentTypeUID="api::test.test"
        intlLabel={{
          id: 'test',
          defaultMessage: 'Label',
        }}
        name="name"
        onChange={jest.fn()}
        {...props}
      />,
      {
        wrapper({ children }) {
          const client = new QueryClient({
            defaultOptions: {
              queries: {
                retry: false,
              },
            },
          });

          return (
            <QueryClientProvider client={client}>
              <ThemeProvider theme={lightTheme}>
                <IntlProvider locale="en" messages={{}}>
                  <NotificationsProvider>{children}</NotificationsProvider>
                </IntlProvider>
              </ThemeProvider>
            </QueryClientProvider>
          );
        },
      }
    ),
    user: userEvent.setup(),
  };
};

describe('InputUID', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders', async () => {
    const { getByText, getByRole, findByText } = render({
      hint: 'hint',
      value: 'test',
      required: true,
      labelAction: <>action</>,
    });

    await findByText('Unavailable');

    expect(getByText('Label')).toBeInTheDocument();
    expect(getByText('*')).toBeInTheDocument();
    expect(getByText('action')).toBeInTheDocument();
    expect(getByText('hint')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('test');
  });

  test('renders an error', async () => {
    const { getByText, findByText } = render({
      value: 'test',
      error: 'error',
    });

    await findByText('Unavailable');

    expect(getByText('error')).toBeInTheDocument();
  });

  test('Hides the regenerate label when disabled', async () => {
    const { queryByRole, findByText } = render({ disabled: true, value: 'test' });

    await findByText('Unavailable');

    expect(queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  test('Calls onChange handler', async () => {
    const spy = jest.fn();
    const { getByRole, user } = render({ value: 'test', onChange: spy });

    const value = 'test-new';

    await user.type(getByRole('textbox'), value);

    expect(spy).toHaveBeenCalledTimes(value.length);
  });

  test('Regenerates the value based on the target field', async () => {
    const spy = jest.fn();
    const { getByRole, queryByTestId, user } = render({ onChange: spy, value: '' });

    await user.click(getByRole('button', { name: /regenerate/i }));

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(spy).toHaveBeenCalledWith({
      target: {
        name: 'name',
        type: 'text',
        value: 'source-string',
      },
    });
  });

  test('If the field is required and the value is empty it should automatically fill it', async () => {
    const spy = jest.fn();

    const { queryByTestId } = render({
      value: '',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(spy).toHaveBeenCalledWith(
      {
        target: {
          name: 'name',
          type: 'text',
          value: 'source-string',
        },
      },
      true
    );
  });

  test('If the field is required and the value is not empty it should not automatically fill it', async () => {
    const spy = jest.fn();

    const { queryByTestId } = render({
      value: 'test',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(spy).not.toHaveBeenCalled();
  });

  test('Checks the initial availability (isAvailable)', async () => {
    jest.useFakeTimers();
    const spy = jest.fn();

    const { getByText, queryByText, queryByTestId } = render({
      value: 'available',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(getByText('Available')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(queryByText('Available')).not.toBeInTheDocument(), {
      timeout: 10000,
    });

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Checks the initial availability (!isAvailable)', async () => {
    const spy = jest.fn();

    const { getByText, queryByTestId, queryByText } = render({
      value: 'not-available',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(getByText('Unavailable')).toBeInTheDocument();

    await waitFor(() => expect(queryByText('Available')).not.toBeInTheDocument(), {
      timeout: 10000,
    });
  });

  test('Does not check the initial availability without a value', async () => {
    const spy = jest.fn();

    const { queryByText, queryByTestId } = render({
      value: '',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(queryByText('Available')).not.toBeInTheDocument();
    expect(queryByText('Unavailable')).not.toBeInTheDocument();
  });
});
