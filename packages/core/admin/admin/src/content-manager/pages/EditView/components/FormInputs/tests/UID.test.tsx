import { render as renderRTL, waitFor, act, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Form } from '../../../../../components/Form';
import { UIDInput, UIDInputProps } from '../UID';

const render = ({
  initialValues = { name: 'test' },
  ...props
}: Partial<UIDInputProps> & { initialValues?: object } = {}) =>
  renderRTL(<UIDInput label="Label" name="name" type="uid" {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Routes>
          <Route
            path="/content-manager/:collectionType/:slug/:id"
            element={
              <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
                {children}
              </Form>
            }
          />
        </Routes>
      ),
    },
    initialEntries: ['/content-manager/collection-types/api::address.address/create'],
  });

describe('UIDInput', () => {
  test('renders', async () => {
    render({
      hint: 'hint',
      required: true,
    });

    await screen.findByText('Unavailable');

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

    await screen.findByText('Unavailable');

    expect(screen.getByText('error')).toBeInTheDocument();
  });

  test('Hides the regenerate label when disabled', async () => {
    render({ disabled: true });

    await screen.findByText('Unavailable');

    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });

  test('Regenerates the value based on the target field', async () => {
    const { user } = render();

    expect(screen.getByRole('textbox', { name: 'Label' })).not.toHaveValue('regenerated');

    await user.click(screen.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('regenerated');
  });

  test.only('If the field is required and the value is empty it should automatically fill it', async () => {
    render({
      initialValues: {},
      required: true,
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Label *' })).toHaveValue('regenerated')
    );
  });

  test('If the field is required and the value is not empty it should not automatically fill it', async () => {
    render({
      initialValues: {
        name: 'Title',
      },
      required: true,
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.getByRole('textbox', { name: 'Label *' })).not.toHaveValue('regenerated');
  });

  test('Checks the initial availability (isAvailable)', async () => {
    jest.useFakeTimers();

    render({
      required: true,
      initialValues: {
        name: 'available',
      },
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.getByText('Available')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => expect(screen.queryByText('Available')).not.toBeInTheDocument(), {
      timeout: 10000,
    });

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Checks the initial availability (!isAvailable)', async () => {
    render({
      required: true,
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.getByText('Unavailable')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Available')).not.toBeInTheDocument(), {
      timeout: 10000,
    });
  });

  test('Does not check the initial availability without a value', async () => {
    render({
      required: true,
      initialValues: {
        name: '',
      },
    });

    await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());

    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });
});
