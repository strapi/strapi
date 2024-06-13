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

  it('formats and returns nested error messages correctly for a non-existent field', () => {
    const { result } = renderHook(() => useField('repeatable.99.missingField'), {
      wrapper: ({ children }) => (
        <FormProvider
          errors={{
            'repeatable.2.anotherField': 'This field is required',
            'repeatable.3.differentField': 'Some other error',
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
