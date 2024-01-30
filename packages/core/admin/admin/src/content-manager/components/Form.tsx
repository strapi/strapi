import * as React from 'react';

import { useCallbackRef } from '@strapi/helper-plugin';
import { generateNKeysBetween } from 'fractional-indexing';
import produce from 'immer';
import isEqual from 'lodash/isEqual';

import { createContext } from '../../components/Context';
import { getIn, setIn } from '../utils/object';

import type { InputProps as InputPropsImpl, EnumerationProps } from './FormInputs/types';
import type * as Yup from 'yup';

/* -------------------------------------------------------------------------------------------------
 * FormContext
 * -----------------------------------------------------------------------------------------------*/
type InputProps = InputPropsImpl | EnumerationProps;

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
  setSubmitting: (isSubmitting: boolean) => void;
  validate: (setErrors?: boolean) => Promise<FormErrors<TFormValues> | null>;
}

const [FormProvider, useForm] = createContext<FormContextValue>('Form');

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/

interface FormProps<TFormValues extends FormValues = FormValues>
  extends Partial<Pick<FormContextValue<TFormValues>, 'disabled' | 'initialValues'>> {
  children: React.ReactNode;
  method: 'POST' | 'PUT';
  onSubmit?: (values: TFormValues, e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  // TODO: type the return value for a validation schema func from Yup.
  validationSchema?: Yup.AnySchema;
}

/**
 * @alpha
 * @description A form component that handles form state, validation and submission.
 * It can additionally handle nested fields and arrays. To access the data you can either
 * use the generic useForm hook or the useField hook when providing the name of your field.
 */
const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ disabled = false, method, onSubmit, ...props }, ref) => {
    const initialValues = React.useRef(props.initialValues ?? {});
    const [state, dispatch] = React.useReducer(reducer, {
      errors: {},
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

    /**
     * Uses the provided validation schema
     */
    const validate: FormContextValue['validate'] = React.useCallback(async () => {
      if (!props.validationSchema) {
        return null;
      }

      try {
        await props.validationSchema.validate(state.values, { abortEarly: false });

        return null;
      } catch (err) {
        if (isErrorYupValidationError(err)) {
          let errors: FormErrors = {};

          if (err.inner) {
            if (err.inner.length === 0) {
              return setIn(errors, err.path!, err.message);
            }
            for (const error of err.inner) {
              if (!getIn(errors, error.path!)) {
                errors = setIn(errors, error.path!, err.message);
              }
            }
          }

          return errors;
        } else {
          // We throw any other errors
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Warning: An unhandled error was caught during validation in <Formik validationSchema />`,
              err
            );
          }

          throw err;
        }
      }
    }, [props, state.values]);

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
        const errors = await validate();

        if (errors !== null) {
          dispatch({
            type: 'SET_ERRORS',
            payload: errors,
          });

          throw new Error('Submission failed');
        }

        await onSubmit(state.values, e);

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
        val = value;
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

    const setSubmitting = React.useCallback((isSubmitting: boolean) => {
      dispatch({ type: 'SET_ISSUBMITTING', payload: isSubmitting });
    }, []);

    return (
      <form ref={ref} method={method} noValidate onSubmit={handleSubmit}>
        <FormProvider
          disabled={disabled}
          onChange={handleChange}
          initialValues={initialValues}
          modified={modified}
          addFieldRow={addFieldRow}
          moveFieldRow={moveFieldRow}
          removeFieldRow={removeFieldRow}
          setSubmitting={setSubmitting}
          validate={validate}
          {...state}
        >
          {props.children}
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
    : string; // otherwise its just a field.
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
  | { type: 'SET_INITIAL_VALUES'; payload: TFormValues };

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
        const newIndex = action.payload.toIndex;

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
        currentField.splice(newIndex, 0, { ...currentRow, __temp_key__: newKey });

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
          newValue.length > 0 ? newValue : undefined
        );

        break;
      }
      case 'SET_ERRORS':
        if (!isEqual(state.errors, action.payload)) {
          state.errors = action.payload;
        }
        break;
      case 'SET_ISSUBMITTING':
        draft.isSubmitting = action.payload;
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
}

const useField = <TValue = any,>(path: string): FieldValue<TValue | undefined> => {
  const initialValue = useForm(
    'useField',
    (state) => getIn(state.initialValues, path) as FieldValue<TValue>['initialValue']
  );

  const value = useForm(
    'useField',
    (state) => getIn(state.values, path) as FieldValue<TValue>['value']
  );

  const handleChange = useForm('useField', (state) => state.onChange);

  const error = useForm('useField', (state) => getIn(state.errors, path));

  return {
    initialValue,
    error,
    onChange: handleChange,
    value: value,
  };
};

export { Form, useField, useForm };
export type { FormProps, FormValues, FormContextValue, FormState, FieldValue, InputProps };
