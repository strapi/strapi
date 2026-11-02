import { act, fireEvent } from '@testing-library/react';
import { render, renderHook, screen, waitFor } from '@tests/utils';

import { clearUnsavedChangesChecks, hasUnsavedChanges } from '../../utils/unsavedChangesRegistry';
import { Blocker, Form, useField } from '../Form';

const createFormWrapper = (initialErrors: React.ComponentProps<typeof Form>['initialErrors']) =>
  function ({ children }: { children: React.ReactNode }) {
    return (
      <Form method="POST" initialErrors={initialErrors}>
        {children}
      </Form>
    );
  };

describe('useField hook', () => {
  it('formats and returns nested error messages correctly for field constraints', () => {
    const expectedError = 'This attribute must be unique';
    const initialErrors = {
      repeatable: [
        {
          nestedUnique: {
            TextShort: 'Another error message',
          },
        },
        {
          nestedUnique: {
            nestedLevelOne: {
              nestedLevelTwo: {
                Unique: expectedError,
              },
            },
          },
        },
      ],
    };

    const { result } = renderHook(
      () => useField('repeatable.1.nestedUnique.nestedLevelOne.nestedLevelTwo.Unique'),
      {
        wrapper: createFormWrapper(initialErrors),
      }
    );

    expect(result.current.error).toEqual(expectedError);
  });

  it('formats and returns error messages correctly for translation message descriptors', () => {
    const messageDescriptor = {
      id: 'unique.attribute.error',
      defaultMessage: 'This attribute must be unique',
    };
    const initialErrors = {
      nested: {
        uniqueAttribute: messageDescriptor,
      },
    };

    const { result } = renderHook(() => useField('nested.uniqueAttribute'), {
      wrapper: createFormWrapper(initialErrors),
    });

    expect(result.current.error).toEqual('This attribute must be unique');
  });

  it('handles mixed error types correctly', () => {
    const messageDescriptor = {
      id: 'mixed.error',
      defaultMessage: 'Mixed error message',
    };
    const initialErrors = {
      mixed: {
        errorField: messageDescriptor,
        stringError: 'String error message',
        otherError: 123, // Non-string, non-descriptor error
      },
    };

    const { result } = renderHook(() => useField('mixed.otherError'), {
      wrapper: createFormWrapper(initialErrors),
    });

    expect(result.current.error).toBeUndefined();
  });

  it('handles errors associated with array indices', () => {
    const initialErrors = {
      array: [
        {
          field: 'Error on first array item',
        },
        {
          field: 'Error on second array item',
        },
      ],
    };

    const { result } = renderHook(() => useField('array.0.field'), {
      wrapper: createFormWrapper(initialErrors),
    });

    expect(result.current.error).toEqual('Error on first array item');
  });

  it('returns undefined when there are no errors', () => {
    const initialErrors = {};

    const { result } = renderHook(() => useField('no.errors.field'), {
      wrapper: createFormWrapper(initialErrors),
    });

    expect(result.current.error).toBeUndefined();
  });

  it('returns undefined for non-existent error paths', () => {
    const initialErrors = {
      valid: {
        path: 'Error message',
      },
    };

    const { result } = renderHook(() => useField('invalid.path'), {
      wrapper: createFormWrapper(initialErrors),
    });

    expect(result.current.error).toBeUndefined();
  });

  it('handles multi-select change events from input-like targets', () => {
    const { result } = renderHook(() => useField('options'), {
      wrapper: createFormWrapper({}),
    });

    act(() => {
      result.current.onChange({
        target: {
          name: 'options',
          type: 'select-multiple',
          value: '',
          multiple: true,
          options: [
            { selected: true, value: 'first' },
            { selected: false, value: 'second' },
            { selected: true, value: 'third' },
          ],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toEqual(['first', 'third']);
  });
});

describe('Blocker unsaved-changes registration', () => {
  const NameField = () => {
    const field = useField<string>('name');

    return (
      <input aria-label="name" name="name" value={field.value ?? ''} onChange={field.onChange} />
    );
  };

  const renderForm = (onSubmit: React.ComponentProps<typeof Form>['onSubmit']) =>
    render(
      <Form method="PUT" initialValues={{ name: 'initial' }} onSubmit={onSubmit}>
        <NameField />
        <Blocker />
        <button type="submit">Save</button>
      </Form>
    );

  afterEach(() => {
    clearUnsavedChangesChecks();
  });

  it('reports nothing to lose while the form is untouched', () => {
    renderForm(jest.fn());

    expect(hasUnsavedChanges()).toBe(false);
  });

  it('reports unsaved edits once a field changes', async () => {
    const { user } = renderForm(jest.fn());

    await user.type(screen.getByLabelText('name'), '-edited');

    expect(hasUnsavedChanges()).toBe(true);
  });

  /**
   * A session that dies mid-save must still warn: the submit that would have
   * cleared the edits is the one that just failed.
   */
  it('still reports unsaved edits while a submit is in flight', async () => {
    const neverSettles = jest.fn(() => new Promise<void>(() => {}));
    const { user } = renderForm(neverSettles);

    await user.type(screen.getByLabelText('name'), '-edited');
    // jsdom doesn't submit a form when its submit button is clicked.
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.submit(screen.getByLabelText('name').closest('form')!);

    await waitFor(() => expect(neverSettles).toHaveBeenCalled());
    expect(hasUnsavedChanges()).toBe(true);
  });
});
