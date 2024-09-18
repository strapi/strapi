import * as React from 'react';

import { Button, Dialog, useCallbackRef, useComposedRefs } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { generateNKeysBetween } from 'fractional-indexing';
import { produce } from 'immer';
import isEqual from 'lodash/isEqual';
import { useIntl, type MessageDescriptor, type PrimitiveType } from 'react-intl';
import { useBlocker } from 'react-router-dom';

import { getIn, setIn } from '../utils/objects';

import { createContext } from './Context';

import type {
  InputProps as InputPropsImpl,
  StringProps,
  EnumerationProps,
} from './FormInputs/types';
import type * as Yup from 'yup';

/* -------------------------------------------------------------------------------------------------
 * FormContext
 * -----------------------------------------------------------------------------------------------*/
type InputProps = InputPropsImpl | StringProps | EnumerationProps;

interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

interface FormValues {
  [field: string]: any;
}

interface FormContextValue<TFormValues extends FormValues = FormValues>
  extends FormState<TFormValues> {
  disabled: boolean;
  initialValues: TFormValues;
  modified: boolean;
  /**
   * The default behaviour is to add the row to the end of the array, if you want to add it to a
   * specific index you can pass the index.
   */
  addFieldRow: (field: string, value: any, addAtIndex?: number) => void;
  moveFieldRow: (field: string, fromIndex: number, toIndex: number) => void;
  onChange: (eventOrPath: React.ChangeEvent<any> | string, value?: any) => void;
  /*
   * The default behaviour is to remove the last row, if you want to remove a specific index you can
   * pass the index.
   */
  removeFieldRow: (field: string, removeAtIndex?: number) => void;
  resetForm: () => void;
  setErrors: (errors: FormErrors<TFormValues>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setValues: (values: TFormValues) => void;
  validate: (
    shouldSetErrors?: boolean,
    options?: Record<string, string>
  ) => Promise<
    { data: TFormValues; errors?: never } | { data?: never; errors: FormErrors<TFormValues> }
  >;
}

/**
 * @internal
 * @description We use this just to warn people that they're using the useForm
 * methods outside of a Form component, but we don't want to throw an error
 * because otherwise the DocumentActions list cannot be rendered in our list-view.
 */
const ERR_MSG =
  'The Form Component has not been initialised, ensure you are using this hook within a Form component';

const [FormProvider, useForm] = createContext<FormContextValue>('Form', {
  disabled: false,
  errors: {},
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
});

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/

interface FormHelpers<TFormValues extends FormValues = FormValues>
  extends Pick<FormContextValue<TFormValues>, 'setErrors' | 'setValues' | 'resetForm'> {}

interface FormProps<TFormValues extends FormValues = FormValues>
  extends Partial<Pick<FormContextValue<TFormValues>, 'disabled' | 'initialValues'>> {
  children:
    | React.ReactNode
    | ((
        props: Pick<
          FormContextValue<TFormValues>,
          | 'disabled'
          | 'errors'
          | 'isSubmitting'
          | 'modified'
          | 'values'
          | 'resetForm'
          | 'onChange'
          | 'setErrors'
        >
      ) => React.ReactNode);
  method: 'POST' | 'PUT';
  onSubmit?: (values: TFormValues, helpers: FormHelpers<TFormValues>) => Promise<void> | void;
  // TODO: type the return value for a validation schema func from Yup.
  validationSchema?: Yup.AnySchema;
  initialErrors?: FormErrors<TFormValues>;
  // NOTE: we don't know what return type it can be here
  validate?: (values: TFormValues, options: Record<string, string>) => Promise<any>;
}

/**
 * @alpha
 * @description A form component that handles form state, validation and submission.
 * It can additionally handle nested fields and arrays. To access the data you can either
 * use the generic useForm hook or the useField hook when providing the name of your field.
 */
const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ disabled = false, method, onSubmit, initialErrors, ...props }, ref) => {
    const formRef = React.useRef<HTMLFormElement>(null!);
    const initialValues = React.useRef(props.initialValues ?? {});
    const [state, dispatch] = React.useReducer(reducer, {
      errors: initialErrors ?? {},
      isSubmitting: false,
      values: props.initialValues ?? {},
    });

    React.useEffect(() => {
      /**
       * ONLY update the initialValues if the prop has changed.
       */
      if (!isEqual(initialValues.current, props.initialValues)) {
        initialValues.current = props.initialValues ?? {};

        dispatch({
          type: 'SET_INITIAL_VALUES',
          payload: props.initialValues ?? {},
        });
      }
    }, [props.initialValues]);

    const setErrors = React.useCallback((errors: FormErrors) => {
      dispatch({
        type: 'SET_ERRORS',
        payload: errors,
      });
    }, []);

    const setValues = React.useCallback((values: FormValues) => {
      dispatch({
        type: 'SET_VALUES',
        payload: values,
      });
    }, []);

    React.useEffect(() => {
      if (Object.keys(state.errors).length === 0) return;

      /**
       * Small timeout to ensure the form has been
       * rendered before we try to focus on the first
       */
      const ref = setTimeout(() => {
        const [firstError] = formRef.current.querySelectorAll('[data-strapi-field-error]');

        if (firstError) {
          const errorId = firstError.getAttribute('id');
          const formElementInError = formRef.current.querySelector(
            `[aria-describedby="${errorId}"]`
          );

          if (formElementInError && formElementInError instanceof HTMLElement) {
            formElementInError.focus();
          }
        }
      });

      return () => clearTimeout(ref);
    }, [state.errors]);

    /**
     * Uses the provided validation schema
     */
    const validate = React.useCallback(
      async (shouldSetErrors: boolean = true, options: Record<string, string> = {}) => {
        setErrors({});

        if (!props.validationSchema && !props.validate) {
          return { data: state.values };
        }

        try {
          let data;
          if (props.validationSchema) {
            data = await props.validationSchema.validate(state.values, { abortEarly: false });
          } else if (props.validate) {
            data = await props.validate(state.values, options);
          } else {
            throw new Error('No validation schema or validate function provided');
          }

          return { data };
        } catch (err) {
          if (isErrorYupValidationError(err)) {
            const errors = getYupValidationErrors(err);

            if (shouldSetErrors) {
              setErrors(errors);
            }

            return { errors };
          } else {
            // We throw any other errors
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `Warning: An unhandled error was caught during validation in <Form validationSchema />`,
                err
              );
            }

            throw err;
          }
        }
      },
      [props, setErrors, state.values]
    );

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (!onSubmit) {
        return;
      }

      dispatch({
        type: 'SUBMIT_ATTEMPT',
      });

      try {
        const { data, errors } = await validate();

        if (errors) {
          setErrors(errors);

          throw new Error('Submission failed');
        }

        await onSubmit(data, {
          setErrors,
          setValues,
          resetForm,
        });

        dispatch({
          type: 'SUBMIT_SUCCESS',
        });
      } catch (err) {
        dispatch({
          type: 'SUBMIT_FAILURE',
        });

        if (err instanceof Error && err.message === 'Submission failed') {
          return;
        }
      }
    };

    const modified = React.useMemo(
      () => !isEqual(initialValues.current, state.values),
      [state.values]
    );

    const handleChange: FormContextValue['onChange'] = useCallbackRef((eventOrPath, v) => {
      if (typeof eventOrPath === 'string') {
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: {
            field: eventOrPath,
            value: v,
          },
        });

        return;
      }

      const target = eventOrPath.target || eventOrPath.currentTarget;

      const { type, name, id, value, options, multiple } = target;

      const field = name || id;

      if (!field && process.env.NODE_ENV !== 'production') {
        console.warn(
          `\`onChange\` was called with an event, but you forgot to pass a \`name\` or \`id'\` attribute to your input. The field to update cannot be determined`
        );
      }

      /**
       * Because we handle any field from this function, we run through a series
       * of checks to understand how to use the value.
       */
      let val;

      if (/number|range/.test(type)) {
        const parsed = parseFloat(value);
        // If the value isn't a number for whatever reason, don't let it through because that will break the API.
        val = isNaN(parsed) ? '' : parsed;
      } else if (/checkbox/.test(type)) {
        // Get & invert the current value of the checkbox.
        val = !getIn(state.values, field);
      } else if (options && multiple) {
        // This will handle native select elements incl. ones with mulitple options.
        val = Array.from<HTMLOptionElement>(options)
          .filter((el) => el.selected)
          .map((el) => el.value);
      } else {
        // NOTE: reset value to null so it failes required checks.
        // The API only considers a required field invalid if the value is null|undefined, to differentiate from min 1
        if (value === '') {
          val = null;
        } else {
          val = value;
        }
      }

      if (field) {
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: {
            field,
            value: val,
          },
        });
      }
    });

    const addFieldRow: FormContextValue['addFieldRow'] = React.useCallback(
      (field, value, addAtIndex) => {
        dispatch({
          type: 'ADD_FIELD_ROW',
          payload: {
            field,
            value,
            addAtIndex,
          },
        });
      },
      []
    );

    const removeFieldRow: FormContextValue['removeFieldRow'] = React.useCallback(
      (field, removeAtIndex) => {
        dispatch({
          type: 'REMOVE_FIELD_ROW',
          payload: {
            field,
            removeAtIndex,
          },
        });
      },
      []
    );

    const moveFieldRow: FormContextValue['moveFieldRow'] = React.useCallback(
      (field, fromIndex, toIndex) => {
        dispatch({
          type: 'MOVE_FIELD_ROW',
          payload: {
            field,
            fromIndex,
            toIndex,
          },
        });
      },
      []
    );

    const resetForm: FormContextValue['resetForm'] = React.useCallback(() => {
      dispatch({
        type: 'RESET_FORM',
        payload: {
          errors: {},
          isSubmitting: false,
          values: initialValues.current,
        },
      });
    }, []);

    const setSubmitting = React.useCallback((isSubmitting: boolean) => {
      dispatch({ type: 'SET_ISSUBMITTING', payload: isSubmitting });
    }, []);

    const composedRefs = useComposedRefs(formRef, ref);

    return (
      <form ref={composedRefs} method={method} noValidate onSubmit={handleSubmit}>
        <FormProvider
          disabled={disabled}
          onChange={handleChange}
          initialValues={initialValues.current}
          modified={modified}
          addFieldRow={addFieldRow}
          moveFieldRow={moveFieldRow}
          removeFieldRow={removeFieldRow}
          resetForm={resetForm}
          setErrors={setErrors}
          setValues={setValues}
          setSubmitting={setSubmitting}
          validate={validate}
          {...state}
        >
          {typeof props.children === 'function'
            ? props.children({
                modified,
                disabled,
                onChange: handleChange,
                ...state,
                setErrors,
                resetForm,
              })
            : props.children}
        </FormProvider>
      </form>
    );
  }
) as <TFormValues extends FormValues>(
  p: FormProps<TFormValues> & { ref?: React.Ref<HTMLFormElement> }
) => React.ReactElement; // we've cast this because we need the generic to infer the type of the form values.

/**
 * @internal
 * @description Checks if the error is a Yup validation error.
 */
const isErrorYupValidationError = (err: any): err is Yup.ValidationError =>
  typeof err === 'object' &&
  err !== null &&
  'name' in err &&
  typeof err.name === 'string' &&
  err.name === 'ValidationError';

/* -------------------------------------------------------------------------------------------------
 * getYupValidationErrors
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description handy utility to convert a yup validation error into a form
 * error object. To be used elsewhere.
 */
const getYupValidationErrors = (err: Yup.ValidationError): FormErrors => {
  let errors: FormErrors = {};

  if (err.inner) {
    if (err.inner.length === 0) {
      return setIn(errors, err.path!, err.message);
    }
    for (const error of err.inner) {
      if (!getIn(errors, error.path!)) {
        errors = setIn(errors, error.path!, error.message);
      }
    }
  }

  return errors;
};

/* -------------------------------------------------------------------------------------------------
 * reducer
 * -----------------------------------------------------------------------------------------------*/

type FormErrors<TFormValues extends FormValues = FormValues> = {
  // is it a repeatable component or dynamic zone?
  [Key in keyof TFormValues]?: TFormValues[Key] extends any[]
    ? TFormValues[Key][number] extends object
      ? FormErrors<TFormValues[Key][number]>[] | string | string[]
      : string // this would let us support errors for the dynamic zone or repeatable component not the components within.
    : TFormValues[Key] extends object // is it a regular component?
      ? FormErrors<TFormValues[Key]> // handles nested components
      : string | TranslationMessage; // otherwise its just a field or a translation message.
};

interface FormState<TFormValues extends FormValues = FormValues> {
  /**
   * TODO: make this a better type explaining errors could be nested because it follows the same
   * structure as the values.
   */
  errors: FormErrors<TFormValues>;
  isSubmitting: boolean;
  values: TFormValues;
}

type FormActions<TFormValues extends FormValues = FormValues> =
  | { type: 'SUBMIT_ATTEMPT' }
  | { type: 'SUBMIT_FAILURE' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SET_FIELD_VALUE'; payload: { field: string; value: any } }
  | { type: 'ADD_FIELD_ROW'; payload: { field: string; value: any; addAtIndex?: number } }
  | { type: 'REMOVE_FIELD_ROW'; payload: { field: string; removeAtIndex?: number } }
  | { type: 'MOVE_FIELD_ROW'; payload: { field: string; fromIndex: number; toIndex: number } }
  | { type: 'SET_ERRORS'; payload: FormErrors<TFormValues> }
  | { type: 'SET_ISSUBMITTING'; payload: boolean }
  | { type: 'SET_INITIAL_VALUES'; payload: TFormValues }
  | { type: 'SET_VALUES'; payload: TFormValues }
  | { type: 'RESET_FORM'; payload: FormState<TFormValues> };

const reducer = <TFormValues extends FormValues = FormValues>(
  state: FormState<TFormValues>,
  action: FormActions<TFormValues>
) =>
  produce(state, (draft) => {
    switch (action.type) {
      case 'SET_INITIAL_VALUES':
        // @ts-expect-error – TODO: figure out why this fails ts.
        draft.values = action.payload;
        break;
      case 'SET_VALUES':
        // @ts-expect-error – TODO: figure out why this fails ts.
        draft.values = action.payload;
        break;
      case 'SUBMIT_ATTEMPT':
        draft.isSubmitting = true;
        break;
      case 'SUBMIT_FAILURE':
        draft.isSubmitting = false;
        break;
      case 'SUBMIT_SUCCESS':
        draft.isSubmitting = false;
        break;
      case 'SET_FIELD_VALUE':
        draft.values = setIn(state.values, action.payload.field, action.payload.value);
        break;
      case 'ADD_FIELD_ROW': {
        /**
         * TODO: add check for if the field is an array?
         */
        const currentField = getIn(state.values, action.payload.field, []) as Array<any>;

        let position = action.payload.addAtIndex;

        if (position === undefined) {
          position = currentField.length;
        } else if (position < 0) {
          position = 0;
        }

        const [key] = generateNKeysBetween(
          currentField.at(position - 1)?.__temp_key__,
          currentField.at(position)?.__temp_key__,
          1
        );

        draft.values = setIn(
          state.values,
          action.payload.field,
          setIn(currentField, position.toString(), { ...action.payload.value, __temp_key__: key })
        );

        break;
      }
      case 'MOVE_FIELD_ROW': {
        const { field, fromIndex, toIndex } = action.payload;
        /**
         * TODO: add check for if the field is an array?
         */
        const currentField = [...(getIn(state.values, field, []) as Array<any>)];
        const currentRow = currentField[fromIndex];

        const startKey =
          fromIndex > toIndex
            ? currentField[toIndex - 1]?.__temp_key__
            : currentField[toIndex]?.__temp_key__;
        const endKey =
          fromIndex > toIndex
            ? currentField[toIndex]?.__temp_key__
            : currentField[toIndex + 1]?.__temp_key__;
        const [newKey] = generateNKeysBetween(startKey, endKey, 1);

        currentField.splice(fromIndex, 1);
        currentField.splice(toIndex, 0, { ...currentRow, __temp_key__: newKey });

        draft.values = setIn(state.values, field, currentField);

        break;
      }
      case 'REMOVE_FIELD_ROW': {
        /**
         * TODO: add check for if the field is an array?
         */
        const currentField = getIn(state.values, action.payload.field, []) as Array<any>;

        let position = action.payload.removeAtIndex;

        if (position === undefined) {
          position = currentField.length - 1;
        } else if (position < 0) {
          position = 0;
        }

        /**
         * filter out empty values from the array, the setIn function only deletes the value
         * when we pass undefined as opposed to "removing" it from said array.
         */
        const newValue = setIn(currentField, position.toString(), undefined).filter(
          (val: unknown) => val
        );

        draft.values = setIn(
          state.values,
          action.payload.field,
          newValue.length > 0 ? newValue : []
        );

        break;
      }
      case 'SET_ERRORS':
        if (!isEqual(state.errors, action.payload)) {
          // @ts-expect-error – TODO: figure out why this fails a TS check.
          draft.errors = action.payload;
        }
        break;
      case 'SET_ISSUBMITTING':
        draft.isSubmitting = action.payload;
        break;
      case 'RESET_FORM':
        // @ts-expect-error – TODO: figure out why this fails ts.
        draft.values = action.payload.values;
        // @ts-expect-error – TODO: figure out why this fails ts.
        draft.errors = action.payload.errors;
        draft.isSubmitting = action.payload.isSubmitting;
        break;
      default:
        break;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * useField
 * -----------------------------------------------------------------------------------------------*/
interface FieldValue<TValue = any> {
  error?: string;
  initialValue: TValue;
  onChange: (eventOrPath: React.ChangeEvent<any> | string, value?: TValue) => void;
  value: TValue;
  rawError?: any;
}

const useField = <TValue = any,>(path: string): FieldValue<TValue | undefined> => {
  const { formatMessage } = useIntl();

  const initialValue = useForm(
    'useField',
    (state) => getIn(state.initialValues, path) as FieldValue<TValue>['initialValue']
  );

  const value = useForm(
    'useField',
    (state) => getIn(state.values, path) as FieldValue<TValue>['value']
  );

  const handleChange = useForm('useField', (state) => state.onChange);

  const rawError = useForm('useField', (state) => getIn(state.errors, path));

  const error = useForm('useField', (state) => {
    const error = getIn(state.errors, path);

    if (isErrorMessageDescriptor(error)) {
      const { values, ...message } = error;
      return formatMessage(message, values);
    }

    return error;
  });

  return {
    initialValue,
    /**
     * Errors can be a string, or a MessageDescriptor, so we need to handle both cases.
     * If it's anything else, we don't return it.
     */
    rawError,
    error: isErrorMessageDescriptor(error)
      ? formatMessage(
          {
            id: error.id,
            defaultMessage: error.defaultMessage,
          },
          error.values
        )
      : typeof error === 'string'
        ? error
        : undefined,
    onChange: handleChange,
    value: value,
  };
};

const isErrorMessageDescriptor = (object?: object): object is TranslationMessage => {
  return (
    typeof object === 'object' &&
    object !== null &&
    !Array.isArray(object) &&
    'id' in object &&
    'defaultMessage' in object
  );
};

/**
 * Props for the Blocker component.
 * @param onProceed Function to be called when the user confirms the action that triggered the blocker.
 * @param onCancel Function to be called when the user cancels the action that triggered the blocker.
 */
interface BlockerProps {
  onProceed?: () => void;
  onCancel?: () => void;
}
/* -------------------------------------------------------------------------------------------------
 * Blocker
 * -----------------------------------------------------------------------------------------------*/
const Blocker = ({ onProceed = () => {}, onCancel = () => {} }: BlockerProps) => {
  const { formatMessage } = useIntl();
  const modified = useForm('Blocker', (state) => state.modified);
  const isSubmitting = useForm('Blocker', (state) => state.isSubmitting);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return (
      !isSubmitting &&
      modified &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
    );
  });

  if (blocker.state === 'blocked') {
    const handleCancel = (isOpen: boolean) => {
      if (!isOpen) {
        onCancel();
        blocker.reset();
      }
    };

    return (
      <Dialog.Root open onOpenChange={handleCancel}>
        <Dialog.Content>
          <Dialog.Header>
            {formatMessage({
              id: 'app.components.ConfirmDialog.title',
              defaultMessage: 'Confirmation',
            })}
          </Dialog.Header>
          <Dialog.Body icon={<WarningCircle width="24px" height="24px" fill="danger600" />}>
            {formatMessage({
              id: 'global.prompt.unsaved',
              defaultMessage: 'You have unsaved changes, are you sure you want to leave?',
            })}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary">
                {formatMessage({
                  id: 'app.components.Button.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
            </Dialog.Cancel>
            <Button
              onClick={() => {
                onProceed();
                blocker.proceed();
              }}
              variant="danger"
            >
              {formatMessage({
                id: 'app.components.Button.confirm',
                defaultMessage: 'Confirm',
              })}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    );
  }

  return null;
};

export { Form, Blocker, useField, useForm, getYupValidationErrors };
export type {
  FormErrors,
  FormHelpers,
  FormProps,
  FormValues,
  FormContextValue,
  FormState,
  FieldValue,
  InputProps,
};
