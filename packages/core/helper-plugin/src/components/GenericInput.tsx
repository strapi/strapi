/**
 * TODO: this entire component needs to be refactored to use Attribute as a passed base
 * to then understand the type and value types of what attribute we're rendering with
 * what input and make the types all play nicely. At least now we have an idea of what
 * everything is!
 */

import * as React from 'react';

import {
  Checkbox,
  DatePicker,
  DateTimePicker,
  Icon,
  JSONInput,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  TimePicker,
  ToggleInput,
} from '@strapi/design-system';
import { Eye, EyeStriked } from '@strapi/icons';
import formatISO from 'date-fns/formatISO';
import { useIntl } from 'react-intl';

import { FieldSchema, useFieldHint } from '../hooks/useFieldHint';
import { useFocusInputField } from '../hooks/useFocusInputField';
import { pxToRem } from '../utils/pxToRem';

import type { InputType, TranslationMessage } from '../types';
import type { Attribute } from '@strapi/types';

interface InputOption {
  metadatas: {
    intlLabel: TranslationMessage;
    disabled: boolean;
    hidden: boolean;
  };
  key: string;
  value: string;
}

interface CustomInputProps<TAttribute extends Attribute.Any>
  extends Omit<GenericInputProps<TAttribute>, 'customInputs'> {
  ref?: React.Ref<HTMLElement>;
  hint?: string | React.JSX.Element | (string | React.JSX.Element)[];
}

export interface GenericInputProps<TAttribute extends Attribute.Any = Attribute.Any> {
  attribute?: TAttribute;
  autoComplete?: string;
  customInputs?: Record<string, React.ComponentType<CustomInputProps<TAttribute>>>;
  description?: TranslationMessage;
  disabled?: boolean;
  error?: string | TranslationMessage;
  intlLabel: TranslationMessage;
  labelAction?: React.ReactNode;
  name: string;
  onChange: (
    payload: {
      target: {
        name: string;
        value: Attribute.GetValue<TAttribute>;
        type?: InputType;
      };
    },
    shouldSetInitialValue?: boolean
  ) => void;
  options?: InputOption[];
  placeholder?: TranslationMessage;
  required?: boolean;
  step?: number;
  type: InputType;
  // TODO: The value depends on the input type, too complicated to handle all cases here
  value?: Attribute.GetValue<TAttribute>;
  isNullable?: boolean;
}

const GenericInput = ({
  autoComplete,
  customInputs,
  description,
  disabled,
  intlLabel,
  labelAction,
  error,
  name,
  onChange,
  options = [],
  placeholder,
  required,
  step,
  type,
  value: defaultValue,
  isNullable,
  attribute,
  ...rest
}: GenericInputProps) => {
  const { formatMessage } = useIntl();

  // TODO: Workaround to get the field hint values if they exist on the type
  const getFieldHintValue = (attribute?: Attribute.Any, key?: keyof FieldSchema) => {
    if (!attribute) return;

    if (key === 'minLength' && key in attribute) {
      return attribute[key];
    }

    if (key === 'maxLength' && key in attribute) {
      return attribute[key];
    }

    if (key === 'max' && key in attribute) {
      return attribute[key];
    }

    if (key === 'min' && key in attribute) {
      return attribute[key];
    }
  };

  const { hint } = useFieldHint({
    description,
    fieldSchema: {
      minLength: getFieldHintValue(attribute, 'minLength'),
      maxLength: getFieldHintValue(attribute, 'maxLength'),
      max: getFieldHintValue(attribute, 'max'),
      min: getFieldHintValue(attribute, 'min'),
    },
    type: attribute?.type || type,
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const fieldRef = useFocusInputField(name);

  const CustomInput = customInputs ? customInputs[type] : null;

  // the API always returns null, which throws an error in React,
  // therefore we cast this case to undefined
  const value = defaultValue ?? undefined;

  /*
   TODO: ideally we should pass in `defaultValue` and `value` for
   inputs, in order to make them controlled components. This variable
   acts as a fallback for now, to prevent React errors in devopment mode

   See: https://github.com/strapi/strapi/pull/12861
  */
  const valueWithEmptyStringFallback = value ?? '';

  function getErrorMessage(error: string | TranslationMessage | undefined) {
    if (!error) {
      return null;
    }

    if (typeof error === 'string') {
      return formatMessage({ id: error, defaultMessage: error });
    }

    const values = {
      ...error.values,
    };

    return formatMessage(
      {
        id: error.id,
        defaultMessage: error?.defaultMessage ?? error.id,
      },
      values
    );
  }

  const errorMessage = getErrorMessage(error) ?? undefined;

  if (CustomInput) {
    return (
      <CustomInput
        {...rest}
        ref={fieldRef}
        attribute={attribute}
        description={description}
        hint={hint}
        disabled={disabled}
        intlLabel={intlLabel}
        labelAction={labelAction}
        error={errorMessage || ''}
        name={name}
        onChange={onChange}
        options={options}
        required={required}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    );
  }

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  switch (type) {
    case 'json': {
      return (
        <JSONInput
          // @ts-expect-error JSONInput ref is weird but it does work
          ref={fieldRef}
          label={label}
          labelAction={labelAction}
          value={value}
          error={errorMessage}
          disabled={disabled}
          hint={hint}
          required={required}
          onChange={(json) => {
            // Default to null when the field is not required and there is no input value
            const value =
              attribute && 'required' in attribute && !attribute?.required && !json.length
                ? null
                : json;
            onChange({ target: { name, value } }, false);
          }}
          minHeight={pxToRem(252)}
          maxHeight={pxToRem(504)}
        />
      );
    }
    case 'bool': {
      return (
        <ToggleInput
          ref={fieldRef}
          checked={defaultValue === null ? null : defaultValue || false}
          disabled={disabled}
          hint={hint}
          label={label}
          error={errorMessage}
          labelAction={labelAction}
          name={name}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'False',
          })}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'True',
          })}
          onChange={(e) => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          required={required}
          onClear={() => {
            onChange({ target: { name, value: null } });
          }}
          clearLabel={
            isNullable
              ? formatMessage({
                  id: 'app.components.ToggleCheckbox.clear-label',
                  defaultMessage: 'Clear',
                })
              : undefined
          }
        />
      );
    }
    case 'checkbox': {
      return (
        <Checkbox
          ref={fieldRef}
          disabled={disabled}
          error={errorMessage}
          hint={hint}
          id={name}
          name={name}
          onValueChange={(value) => {
            onChange({ target: { name, value } });
          }}
          required={required}
          value={Boolean(value)}
        >
          {label}
        </Checkbox>
      );
    }
    case 'datetime': {
      return (
        <DateTimePicker
          ref={fieldRef}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(date) => {
            // check if date is not null or undefined
            const formattedDate = date ? date.toISOString() : null;

            onChange({ target: { name, value: formattedDate, type } });
          }}
          onClear={() => onChange({ target: { name, value: null, type } })}
          placeholder={formattedPlaceholder}
          required={required}
          value={value}
        />
      );
    }
    case 'date': {
      return (
        <DatePicker
          ref={fieldRef}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          id={name}
          hint={hint}
          name={name}
          onChange={(date) => {
            onChange({
              target: {
                name,
                value: date ? formatISO(date, { representation: 'date' }) : null,
                type,
              },
            });
          }}
          onClear={() => onChange({ target: { name, value: null, type } })}
          placeholder={formattedPlaceholder}
          required={required}
          selectedDate={value}
        />
      );
    }
    case 'number': {
      return (
        <NumberInput
          ref={fieldRef}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onValueChange={(value) => {
            onChange({ target: { name, value, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          step={step}
          value={value}
        />
      );
    }
    case 'email': {
      return (
        <TextInput
          ref={fieldRef}
          autoComplete={autoComplete}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(e) => {
            onChange({ target: { name, value: e.target.value, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          type="email"
          value={valueWithEmptyStringFallback}
        />
      );
    }
    case 'timestamp':
    case 'text':
    case 'string': {
      return (
        <TextInput
          ref={fieldRef}
          autoComplete={autoComplete}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(e) => {
            onChange({ target: { name, value: e.target.value, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          type="text"
          value={valueWithEmptyStringFallback}
        />
      );
    }
    case 'password': {
      return (
        <TextInput
          ref={fieldRef}
          autoComplete={autoComplete}
          disabled={disabled}
          error={errorMessage}
          endAction={
            <button
              aria-label={formatMessage({
                id: 'Auth.form.password.show-password',
                defaultMessage: 'Show password',
              })}
              onClick={() => {
                setShowPassword((prev) => !prev);
              }}
              style={{
                border: 'none',
                padding: 0,
                background: 'transparent',
              }}
              type="button"
            >
              {showPassword ? (
                <Icon as={Eye} color="neutral500" />
              ) : (
                <Icon as={EyeStriked} color="neutral500" />
              )}
            </button>
          }
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(e) => {
            onChange({ target: { name, value: e.target.value, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          type={showPassword ? 'text' : 'password'}
          value={valueWithEmptyStringFallback}
        />
      );
    }
    case 'select': {
      return (
        <SingleSelect
          ref={fieldRef}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(value) => {
            onChange({ target: { name, value, type: 'select' } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          value={value}
        >
          {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
            return (
              <SingleSelectOption key={key} value={value} disabled={disabled} hidden={hidden}>
                {formatMessage(intlLabel)}
              </SingleSelectOption>
            );
          })}
        </SingleSelect>
      );
    }
    case 'textarea': {
      return (
        <Textarea
          ref={fieldRef}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(event) => onChange({ target: { name, value: event.target.value, type } })}
          required={required}
          placeholder={formattedPlaceholder}
          value={valueWithEmptyStringFallback}
        />
      );
    }
    case 'time': {
      let time = value;

      // The backend send a value which has the following format: '00:45:00.000'
      // or the time picker only supports hours & minutes so we need to mutate the value
      if (typeof value === 'string' && value.split(':').length > 2) {
        const [hour, minute] = value.split(':');
        time = `${hour}:${minute}`;
      }

      return (
        <TimePicker
          ref={fieldRef}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={(time) => {
            onChange({ target: { name, value: `${time}`, type } });
          }}
          onClear={() => {
            onChange({ target: { name, value: null, type } });
          }}
          required={required}
          value={time}
        />
      );
    }
    default: {
      /**
       * If there's no component for the given type, we return a disabled text input
       * showing a "Not supported" title to illustrate the issue.
       */
      return (
        <TextInput
          disabled
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          placeholder="Not supported"
          required={required}
          type="text"
          value=""
        />
      );
    }
  }
};

export { GenericInput };
