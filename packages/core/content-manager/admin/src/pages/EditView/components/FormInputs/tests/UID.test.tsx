import { Form, useField } from '@strapi/admin/strapi-admin';
import { render as renderRTL, waitFor, act, screen, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { UIDInput, UIDInputProps } from '../UID';

const waitForInput = async () => {
  await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
  await screen.findByRole('textbox');
};

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
    userEventOptions: {
      advanceTimers: jest.advanceTimersByTime,
    },
    initialEntries: ['/content-manager/collection-types/api::address.address/create'],
  });

const waitForSlugInput = async () => {
  await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
  await screen.findByRole('textbox', { name: 'Slug' });
};

/**
 * A form-connected input for the target field.
 * Lets tests simulate typing in the field that the UID watches.
 */
const TargetFieldInput = ({ name }: { name: string }) => {
  const field = useField(name);
  return (
    <label>
      {name}
      <input name={name} value={field.value ?? ''} onChange={field.onChange} />
    </label>
  );
};

/**
 * Render helper that includes a target field input alongside the UID input,
 * enabling tests for auto-regeneration when the target field changes.
 */
const renderWithTargetField = ({
  initialValues = { name: '', title: '' },
  targetFieldName = 'title',
  ...props
}: Partial<UIDInputProps> & { initialValues?: object; targetFieldName?: string } = {}) =>
  renderRTL(
    <>
      <TargetFieldInput name={targetFieldName} />
      <UIDInput
        label="Slug"
        name="name"
        type="uid"
        attribute={{ targetField: targetFieldName }}
        {...props}
      />
    </>,
    {
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
      userEventOptions: {
        advanceTimers: jest.advanceTimersByTime,
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/create'],
    }
  );

describe('UIDInput', () => {
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
    jest.useFakeTimers();
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

    jest.useFakeTimers();
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

  describe('Auto-regeneration from target field', () => {
    test('auto-regenerates UID when target field value changes', async () => {
      jest.useFakeTimers();
      const { user } = renderWithTargetField();
      await waitForSlugInput();

      const titleInput = screen.getByRole('textbox', { name: 'title' });
      await user.type(titleInput, 'My Article');

      act(() => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('regenerated')
      );

      jest.useRealTimers();
    });

    test('does not auto-regenerate on first render with existing slug', async () => {
      renderWithTargetField({
        initialValues: { name: 'existing-slug', title: 'Existing Title' },
      });
      await waitForSlugInput();

      expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('existing-slug');
    });

    test('does not auto-regenerate after user manually edits UID', async () => {
      jest.useFakeTimers();
      const { user } = renderWithTargetField();
      await waitForSlugInput();

      // Manually edit the UID field first
      const slugInput = screen.getByRole('textbox', { name: 'Slug' });
      await user.type(slugInput, 'custom-slug');

      // Then change the target field
      const titleInput = screen.getByRole('textbox', { name: 'title' });
      await user.type(titleInput, 'My Article');

      act(() => {
        jest.advanceTimersByTime(400);
      });

      // UID should stay at the manually entered value
      expect(slugInput).toHaveValue('custom-slug');

      jest.useRealTimers();
    });

    test('regenerate button resets manual edit tracking, allowing auto-regeneration again', async () => {
      jest.useFakeTimers();
      let generateCallCount = 0;
      server.use(
        rest.post('/content-manager/uid/generate', async (req, res, ctx) => {
          generateCallCount++;
          return res(ctx.json({ data: `generated-${generateCallCount}` }));
        })
      );

      const { user } = renderWithTargetField();
      await waitForSlugInput();

      // Manually edit the UID
      const slugInput = screen.getByRole('textbox', { name: 'Slug' });
      await user.type(slugInput, 'custom-slug');

      // Click regenerate — resets isCustomModified
      await user.click(screen.getByRole('button', { name: /regenerate/i }));
      await waitFor(() => expect(screen.queryByTestId('loading-wrapper')).not.toBeInTheDocument());
      expect(slugInput).toHaveValue('generated-1');

      // Change the target field — should trigger auto-regeneration
      const titleInput = screen.getByRole('textbox', { name: 'title' });
      await user.type(titleInput, 'New Title');

      act(() => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => expect(slugInput).toHaveValue('generated-2'));

      jest.useRealTimers();
    });
  });
});
