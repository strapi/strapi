import { renderHook } from '@tests/utils';

import { FormProvider, useField } from '../Form';

describe('useField hook', () => {
  const ERR_MSG = 'This should not be called';

  const formProviderProps = {
    disabled: false,
    initialValues: {},
    isSubmitting: false,
    modified: false,
    addFieldRow: () => {
      throw new Error(ERR_MSG);
    },
    moveFieldRow: () => {
      throw new Error(ERR_MSG);
    },
    onChange: () => {
      throw new Error(ERR_MSG);
    },
    removeFieldRow: () => {
      throw new Error(ERR_MSG);
    },
    resetForm: () => {
      throw new Error(ERR_MSG);
    },
    setErrors: () => {
      throw new Error(ERR_MSG);
    },
    setValues: () => {
      throw new Error(ERR_MSG);
    },
    setSubmitting: () => {
      throw new Error(ERR_MSG);
    },
    validate: async () => {
      throw new Error(ERR_MSG);
    },
    values: {},
  };

  it('formats and returns nested error messages correctly for field constraints', () => {
    const expectedError = 'This attribute must be unique';

    const { result } = renderHook(
      () => useField('repeatable.1.nestedUnique.nestedLevelOne.nestedLevelTwo.Unique'),
      {
        wrapper: ({ children }) => (
          <FormProvider
            errors={{
              'repeatable.0.nestedUnique.TextShort': 'Another error message',
              'repeatable.1.nestedUnique.nestedLevelOne.nestedLevelTwo.Unique': expectedError,
            }}
            {...formProviderProps}
          >
            {children}
          </FormProvider>
        ),
      }
    );

    expect(result.current.error).toEqual(expectedError);
  });

  it('formats and returns error messages correctly for translation message descriptors', () => {
    const messageDescriptor = {
      id: 'unique.attribute.error',
      defaultMessage: 'This attribute must be unique',
    };

    const { result } = renderHook(() => useField('nested.uniqueAttribute'), {
      wrapper: ({ children }) => (
        <FormProvider
          errors={{
            'nested.uniqueAttribute': messageDescriptor,
          }}
          {...formProviderProps}
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.error).toEqual('This attribute must be unique');
  });

  it('handles mixed error types correctly', () => {
    const messageDescriptor = {
      id: 'mixed.error',
      defaultMessage: 'Mixed error message',
    };

    const { result } = renderHook(() => useField('mixed.otherError'), {
      wrapper: ({ children }) => (
        <FormProvider
          errors={{
            'mixed.errorField': messageDescriptor,
            'mixed.stringError': 'String error message',
            // @ts-expect-error for testing purposes
            'mixed.otherError': 123, // Non-string, non-descriptor error
          }}
          {...formProviderProps}
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.error).toBeUndefined();
  });

  it('handles errors associated with array indices', () => {
    const { result } = renderHook(() => useField('array.0.field'), {
      wrapper: ({ children }) => (
        <FormProvider
          errors={{
            'array.0.field': 'Error on first array item',
            'array.1.field': 'Error on second array item',
          }}
          {...formProviderProps}
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.error).toEqual('Error on first array item');
  });

  it('returns undefined when there are no errors', () => {
    const { result } = renderHook(() => useField('no.errors.field'), {
      wrapper: ({ children }) => (
        <FormProvider errors={{}} {...formProviderProps}>
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.error).toBeUndefined();
  });

  it('returns undefined for non-existent error paths', () => {
    const { result } = renderHook(() => useField('invalid.path'), {
      wrapper: ({ children }) => (
        <FormProvider
          errors={{
            'valid.path': 'Error message',
          }}
          {...formProviderProps}
        >
          {children}
        </FormProvider>
      ),
    });

    expect(result.current.error).toBeUndefined();
  });
});
