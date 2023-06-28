import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';

import InputUID from '../index';

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
  useNotification: jest.fn().mockReturnValue(() => {}),
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

function setup(props) {
  return render(
    <InputUID
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
        return (
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}}>
              {children}
            </IntlProvider>
          </ThemeProvider>
        );
      },
    }
  );
}

describe('Content-Manager | <InputUID />', () => {
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
    const { getByText, getByRole } = await setup({
      hint: 'hint',
      value: 'test',
      required: true,
      labelAction: <>action</>,
    });

    expect(getByText('Label')).toBeInTheDocument();
    expect(getByText('*')).toBeInTheDocument();
    expect(getByText('action')).toBeInTheDocument();
    expect(getByText('hint')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('test');
  });

  test('renders an error', async () => {
    const { getByText } = await setup({
      error: 'error',
    });

    expect(getByText('error')).toBeInTheDocument();
  });

  test('Hides the regenerate label when disabled', async () => {
    const { queryByRole } = await setup({ disabled: true, value: 'test' });

    expect(queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  test('Calls onChange handler', async () => {
    const spy = jest.fn();
    const { getByRole } = await setup({ value: 'test', onChange: spy });

    fireEvent.change(getByRole('textbox'), { target: { value: 'test-new' } });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('Regenerates the value based on the target field', async () => {
    const user = userEvent.setup();
    const spy = jest.fn();
    const { getByRole, queryByTestId } = await setup({ onChange: spy, value: '' });

    await user.click(getByRole('button', { name: /regenerate/i }));

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

  test('If the field is required and the value is empty it should automatically fill it', async () => {
    const spy = jest.fn();

    const { queryByTestId } = await setup({
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

    const { queryByTestId } = await setup({
      value: 'test',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(spy).not.toHaveBeenCalled();
  });

  test('Checks the initial availability (isAvailable)', async () => {
    const spy = jest.fn();

    const { getByText, queryByText, queryByTestId } = await setup({
      value: 'available',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(getByText('Available')).toBeInTheDocument();

    await waitFor(() => expect(queryByText('Available')).not.toBeInTheDocument(), {
      timeout: 10000,
    });
  });

  test('Checks the initial availability (!isAvailable)', async () => {
    const spy = jest.fn();

    const { getByText, queryByTestId, queryByText } = await setup({
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

    const { queryByText, queryByTestId } = await setup({
      value: '',
      required: true,
      onChange: spy,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(queryByText('Available')).not.toBeInTheDocument();
    expect(queryByText('Unavailable')).not.toBeInTheDocument();
  });
});
