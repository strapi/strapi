import { render as renderRTL, waitFor, act } from '@tests/utils';

import { UIDInput, UIDInputProps } from '../UID';

const render = (props?: Partial<UIDInputProps>) =>
  renderRTL(
    <UIDInput
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
    />
  );

describe('InputUID', () => {
  test('renders', async () => {
    const { getByText, getByRole, findByText } = render({
      hint: 'hint',
      required: true,
    });

    await findByText('Unavailable');

    expect(getByText('Label')).toBeInTheDocument();
    expect(getByText('*')).toBeInTheDocument();
    expect(getByText('action')).toBeInTheDocument();
    expect(getByText('hint')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('test');
  });

  test('renders an error', async () => {
    const { getByText, findByText } = render();

    await findByText('Unavailable');

    expect(getByText('error')).toBeInTheDocument();
  });

  test('Hides the regenerate label when disabled', async () => {
    const { queryByRole, findByText } = render({ disabled: true });

    await findByText('Unavailable');

    expect(queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  test('Calls onChange handler', async () => {
    const spy = jest.fn();
    const { getByRole, user } = render();

    const value = 'test-new';

    await user.type(getByRole('textbox'), value);

    expect(spy).toHaveBeenCalledTimes(value.length);
  });

  test('Regenerates the value based on the target field', async () => {
    const spy = jest.fn();
    const { getByRole, queryByTestId, user } = render();

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
      required: true,
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
      required: true,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(spy).not.toHaveBeenCalled();
  });

  test('Checks the initial availability (isAvailable)', async () => {
    jest.useFakeTimers();
    const spy = jest.fn();

    const { getByText, queryByText, queryByTestId } = render({
      required: true,
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
      required: true,
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
      required: true,
    });

    await waitFor(() => expect(queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(queryByText('Available')).not.toBeInTheDocument();
    expect(queryByText('Unavailable')).not.toBeInTheDocument();
  });
});
