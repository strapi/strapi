import * as React from 'react';

import { useCallbackRef } from '@strapi/helper-plugin';
import produce from 'immer';
import isEqual from 'lodash/isEqual';

import { createContext } from '../../components/Context';
import { getIn, setIn } from '../utils/object';

/* -------------------------------------------------------------------------------------------------
 * FormContext
 * -----------------------------------------------------------------------------------------------*/

interface FormValues {
  [field: string]: any;
}

interface FormContextValue<TFormValues extends FormValues = FormValues>
  extends FormState<TFormValues> {
  initialValues: TFormValues;
  modified: boolean;
  onChange: (e: React.ChangeEvent<any>) => void;
}

const [FormProvider, useForm] = createContext<FormContextValue>('Form');

/* -------------------------------------------------------------------------------------------------
 * Form
 * -----------------------------------------------------------------------------------------------*/

interface FormProps<TFormValues extends FormValues = FormValues>
  extends Pick<FormContextValue, 'initialValues'> {
  children: React.ReactNode;
  method: 'POST' | 'PUT';
  onSubmit: (values: TFormValues, e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  validate?: (values: TFormValues) => object | null | Promise<object | null>;
}

const Form = React.forwardRef<HTMLFormElement, FormProps>((props, ref) => {
  const initialValues = React.useRef(props.initialValues);
  const [state, dispatch] = React.useReducer(reducer, {
    errors: {},
    isSubmitting: false,
    values: props.initialValues,
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    dispatch({
      type: 'SUBMIT_ATTEMPT',
    });
    e.preventDefault();

    try {
      dispatch({
        type: 'SUBMIT_SUCCESS',
      });
    } catch {
      dispatch({
        type: 'SUBMIT_FAILURE',
      });
    }
  };

  const modified = React.useMemo(
    () => !isEqual(initialValues.current, state.values),
    [state.values]
  );

  const handleChange = useCallbackRef((e: React.ChangeEvent<any>) => {
    /**
     * If we can, persist the event:
     * @see https://reactjs.org/docs/events.html#event-pooling
     */
    if (e.persist) {
      e.persist();
    }

    const target = e.target ? e.target : e.currentTarget;

    const { type, name, id, value, options, multiple } = target;

    const field = name || id;

    // TODO: make the error DEV only.
    if (!field /*&& __DEV__*/) {
      /**
       * TODO: add warning that there is no field
       */
    }

    let parsed;
    const val = /number|range/.test(type)
      ? ((parsed = parseFloat(value)), isNaN(parsed) ? '' : parsed)
      : /checkbox/.test(type) // checkboxes
      ? !getIn(state.values, field)
      : options && multiple // <select multiple>
      ? Array.from<HTMLOptionElement>(options)
          .filter((el) => el.selected)
          .map((el) => el.value)
      : value;

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

  return (
    <form ref={ref} method={props.method} noValidate onSubmit={handleSubmit}>
      <FormProvider
        onChange={handleChange}
        initialValues={initialValues}
        modified={modified}
        {...state}
      >
        {props.children}
      </FormProvider>
    </form>
  );
});

/* -------------------------------------------------------------------------------------------------
 * reducer
 * -----------------------------------------------------------------------------------------------*/

interface FormState<TFormValues extends FormValues = FormValues> {
  errors: object;
  isSubmitting: boolean;
  values: TFormValues;
}

type FormActions =
  | { type: 'SUBMIT_ATTEMPT' }
  | { type: 'SUBMIT_FAILURE' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SET_FIELD_VALUE'; payload: { field: string; value: any } };

const reducer: React.Reducer<FormState, FormActions> = (state, action) =>
  produce(state, (draft) => {
    switch (action.type) {
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
      default:
        break;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * useField
 * -----------------------------------------------------------------------------------------------*/

interface FieldValue<TValue = any> extends Pick<FormContextValue, 'onChange'> {
  initialValue: TValue;
  value: TValue;
}

const useField = <TValue = any,>(path: string): FieldValue<TValue> => {
  const initialValue = useForm(
    'useField',
    (state) => getIn(state.initialValues, path) as FieldValue<TValue>['initialValue']
  );
  const value = useForm(
    'useField',
    (state) => getIn(state.values, path) as FieldValue<TValue>['value']
  );

  const handleChange = useForm('useField', (state) => state.onChange);

  /**
   * TODO: add field schema.
   */
  return {
    initialValue,
    onChange: handleChange,
    value: value,
  };
};

export { Form, useField, useForm };
export type { FormProps, FormValues, FormContextValue, FormState, FieldValue };
