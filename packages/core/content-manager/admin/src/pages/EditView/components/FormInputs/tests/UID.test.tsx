import { Form, useField } from '@strapi/admin/strapi-admin';
import { render as renderRTL, waitFor, act, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { UIDInput, UIDInputProps } from '../UID';

const waitForInput = async () => {
  await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
  await screen.findByRole('textbox', { name: 'Label' });
};

/**
 * The UID input reads its target field off the form, so tests that exercise the
 * generation need a sibling input to drive it. `/content-manager/uid/generate` is
 * mocked to echo back `data.target`, so whatever is typed here is what the UID
 * should end up holding.
 */
const TargetFieldInput = () => {
  const field = useField<string>('target');

  return (
    <label>
      Target
      <input
        type="text"
        value={field.value ?? ''}
        onChange={(event) => field.onChange('target', event.target.value)}
      />
    </label>
  );
};

const render = ({
  initialValues = { name: 'test' },
  withTargetField = false,
  ...props
}: Partial<UIDInputProps> & { initialValues?: object; withTargetField?: boolean } = {}) =>
  renderRTL(<UIDInput label="Label" name="name" type="uid" {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Routes>
          <Route
            path="/content-manager/:collectionType/:slug/:id"
            element={
              <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
                {withTargetField ? <TargetFieldInput /> : null}
                {children}
              </Form>
            }
          />
        </Routes>
      ),
    },
    userEventOptions: {
      advanceTimers: jest.advanceTimersByTime,
    },
    initialEntries: ['/content-manager/collection-types/api::address.address/create'],
  });

describe('UIDInput', () => {
  // If a previous test throws before `jest.useRealTimers()`, fake timers leak into
  // the next test and break msw v2's interceptor.
  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders', async () => {
    render({
      hint: 'hint',
      required: true,
    });
    await waitForInput();

    // The value wasn't changed so the availability check should not be shown
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();

    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('hint')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('test');
  });

  /**
   * TODO: re-add this test once errors are reimplemented
   */
  test.skip('renders an error', async () => {
    render();
    await waitForInput();

    await screen.findByText('Unavailable');

    expect(screen.getByText('error')).toBeInTheDocument();
  });

  test('Hides the regenerate label when disabled', async () => {
    render({ disabled: true, initialValues: {} });
    await waitForInput();

    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  test('Regenerates the value based on the target field', async () => {
    // MSW v2 / undici use microtasks internally between request emission and handler
    // resolution. Faking `queueMicrotask` / `setImmediate` doesn't block completion but
    // stalls them long enough that each fetch here takes ~10s instead of ~100ms. Keep
    // them real so the file runs in single-digit seconds.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
    const { user } = render({ initialValues: { name: 'foo' } });
    await waitForInput();

    expect(await screen.findByRole('textbox', { name: 'Label' })).not.toHaveValue('regenerated');
    await user.click(screen.getByRole('button', { name: /regenerate/i }));
    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('regenerated');
    jest.useRealTimers();
  });

  test('If the field is required and the value is empty it should automatically fill it', async () => {
    render({
      initialValues: {},
      required: true,
    });
    await waitForInput();

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('regenerated')
    );
  });

  test('If the field is required and the value is not empty it should not automatically fill it', async () => {
    render({
      initialValues: {
        name: 'Title',
      },
      required: true,
    });
    await waitForInput();

    expect(screen.getByRole('textbox', { name: 'Label' })).not.toHaveValue('regenerated');
  });

  test('Generates the value from the target field even when the field is not required', async () => {
    render({
      initialValues: { target: 'My Title' },
      attribute: { targetField: 'target' },
      withTargetField: true,
    });
    await waitForInput();

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('My Title')
    );
  });

  test('Does not generate a value before the target field has one', async () => {
    // Generating here would only produce the server's model-name fallback, which is
    // what used to land in the field on mount.
    render({
      initialValues: {},
      attribute: { targetField: 'target' },
      required: true,
      withTargetField: true,
    });
    await waitForInput();

    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Label' })).not.toHaveValue('regenerated');
  });

  test('Follows the target field until the user edits the value themselves', async () => {
    // MSW v2 / undici use microtasks internally between request emission and handler
    // resolution. Faking `queueMicrotask` / `setImmediate` doesn't block completion but
    // stalls them long enough that each fetch here takes ~10s instead of ~100ms. Keep
    // them real so the file runs in single-digit seconds.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
    const { user } = render({
      initialValues: {},
      attribute: { targetField: 'target' },
      withTargetField: true,
    });
    await waitForInput();

    const uidInput = screen.getByRole('textbox', { name: 'Label' });
    const targetInput = screen.getByRole('textbox', { name: 'Target' });

    await user.type(targetInput, 'first');
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(uidInput).toHaveValue('first'));

    // Still untouched, so it keeps tracking the target field.
    await user.clear(targetInput);
    await user.type(targetInput, 'second');
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(uidInput).toHaveValue('second'));

    // Once the user owns the value, the target field must not overwrite it.
    await user.clear(uidInput);
    await user.type(uidInput, 'mine');
    await user.clear(targetInput);
    await user.type(targetInput, 'third');
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
    expect(uidInput).toHaveValue('mine');

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Does not refill the value after the user clears it', async () => {
    // MSW v2 / undici use microtasks internally between request emission and handler
    // resolution. Faking `queueMicrotask` / `setImmediate` doesn't block completion but
    // stalls them long enough that each fetch here takes ~10s instead of ~100ms. Keep
    // them real so the file runs in single-digit seconds.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
    const { user } = render({
      initialValues: { target: 'My Title' },
      attribute: { targetField: 'target' },
      withTargetField: true,
    });
    await waitForInput();

    const uidInput = screen.getByRole('textbox', { name: 'Label' });
    await waitFor(() => expect(uidInput).toHaveValue('My Title'));

    await user.clear(uidInput);
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
    expect(uidInput).toHaveValue('');

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Checks the availability', async () => {
    const { user } = render({
      required: true,
      initialValues: {
        name: 'init',
      },
    });
    await waitForInput();

    // The value wasn't changed so the availability check should not be shown
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Unvailable')).not.toBeInTheDocument();

    // MSW v2 / undici use microtasks internally between request emission and handler
    // resolution. Faking `queueMicrotask` / `setImmediate` doesn't block completion but
    // stalls them long enough that each fetch here takes ~10s instead of ~100ms. Keep
    // them real so the file runs in single-digit seconds.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'not-taken');

    // Skip debouncing delay
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
    expect(await screen.findByText(/^Available$/)).toBeInTheDocument();

    // Change the value to make it unavailable
    await user.type(input, 'taken');
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(await screen.findByText(/^Unavailable$/)).toBeInTheDocument();

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Does not check availability when a changed value is cleared', async () => {
    // MSW v2 / undici use microtasks internally between request emission and handler
    // resolution. Faking `queueMicrotask` / `setImmediate` doesn't block completion but
    // stalls them long enough that each fetch here takes ~10s instead of ~100ms. Keep
    // them real so the file runs in single-digit seconds.
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
    let availabilityChecks = 0;
    server.use(
      http.post('/content-manager/uid/check-availability', () => {
        availabilityChecks += 1;

        return HttpResponse.json({ isAvailable: false });
      })
    );

    const { user } = render({
      required: true,
      initialValues: {
        name: 'init',
      },
    });
    await waitForInput();

    const input = screen.getByRole('textbox');
    await user.clear(input);

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await Promise.resolve();

    expect(availabilityChecks).toBe(0);
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Does not check the initial availability without a value', async () => {
    render({
      required: true,
      initialValues: {
        name: '',
      },
    });
    await waitForInput();

    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });
});
