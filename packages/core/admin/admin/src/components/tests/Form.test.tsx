import { renderHook } from '@tests/utils';

import { Form, useField } from '../Form';

const createFormWrapper = (initialErrors: Record<string, any>) =>
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
});
