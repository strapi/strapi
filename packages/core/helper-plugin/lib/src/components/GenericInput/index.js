/**
 *
 * GenericInput
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import parseISO from 'date-fns/parseISO';
import formatISO from 'date-fns/formatISO';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { DatePicker } from '@strapi/design-system/DatePicker';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { Select, Option } from '@strapi/design-system/Select';
import { Textarea } from '@strapi/design-system/Textarea';
import { TextInput } from '@strapi/design-system/TextInput';
import { TimePicker } from '@strapi/design-system/TimePicker';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Icon } from '@strapi/design-system/Icon';
import EyeStriked from '@strapi/icons/EyeStriked';
import Eye from '@strapi/icons/Eye';
import DateTimePicker from '../DateTimePicker';
import NotSupported from './NotSupported';

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
  options,
  placeholder,
  required,
  step,
  type,
  value: defaultValue,
  isNullable,
  ...rest
}) => {
  const { formatMessage } = useIntl();
  const [showPassword, setShowPassword] = useState(false);

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

  function getErrorMessage(error) {
    if (!error) {
      return null;
    }

    const values = {
      ...error.values,
    };

    if (typeof error === 'string') {
      return formatMessage({ id: error, defaultMessage: error }, values);
    }

    return formatMessage(
      {
        id: error.id,
        defaultMessage: error?.defaultMessage ?? error.id,
      },
      values
    );
  }

  const errorMessage = getErrorMessage(error);

  if (CustomInput) {
    return (
      <CustomInput
        {...rest}
        description={description}
        disabled={disabled}
        intlLabel={intlLabel}
        labelAction={labelAction}
        error={errorMessage}
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

  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  switch (type) {
    case 'bool': {
      const clearProps = {
        clearLabel:
          isNullable &&
          formatMessage({
            id: 'app.components.ToggleCheckbox.clear-label',
            defaultMessage: 'Clear',
          }),

        onClear:
          isNullable &&
          (() => {
            onChange({ target: { name, value: null } });
          }),
      };

      return (
        <ToggleInput
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
          onChange={e => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          required={required}
          {...clearProps}
        />
      );
    }
    case 'checkbox': {
      return (
        <Checkbox
          disabled={disabled}
          error={errorMessage}
          hint={hint}
          id={name}
          name={name}
          onValueChange={value => {
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
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={date => {
            const formattedDate = date.toISOString();

            onChange({ target: { name, value: formattedDate, type } });
          }}
          step={step}
          onClear={() => onChange({ target: { name, value: null, type } })}
          placeholder={formattedPlaceholder}
          required={required}
          value={value && new Date(value)}
          selectedDateLabel={formattedDate => `Date picker, current is ${formattedDate}`}
        />
      );
    }
    case 'date': {
      let selectedDate = null;

      if (value) {
        selectedDate = parseISO(value);
      }

      return (
        <DatePicker
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={date => {
            onChange({
              target: { name, value: formatISO(date, { representation: 'date' }), type },
            });
          }}
          onClear={() => onChange({ target: { name, value: null, type } })}
          placeholder={formattedPlaceholder}
          required={required}
          selectedDate={selectedDate}
          selectedDateLabel={formattedDate => `Date picker, current is ${formattedDate}`}
        />
      );
    }
    case 'number': {
      return (
        <NumberInput
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onValueChange={value => {
            onChange({ target: { name, value: value ?? null, type } });
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
          autoComplete={autoComplete}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={onChange}
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
          autoComplete={autoComplete}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={onChange}
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
                setShowPassword(prev => !prev);
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
          onChange={onChange}
          placeholder={formattedPlaceholder}
          required={required}
          type={showPassword ? 'text' : 'password'}
          value={valueWithEmptyStringFallback}
        />
      );
    }
    case 'select': {
      return (
        <Select
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={value => {
            onChange({ target: { name, value: value === '' ? null : value, type: 'select' } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          value={value}
        >
          {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
            return (
              <Option key={key} value={value} disabled={disabled} hidden={hidden}>
                {formatMessage(intlLabel)}
              </Option>
            );
          })}
        </Select>
      );
    }
    case 'textarea': {
      return (
        <Textarea
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={onChange}
          required={required}
          placeholder={formattedPlaceholder}
          type={type}
          value={valueWithEmptyStringFallback}
        >
          {value}
        </Textarea>
      );
    }
    case 'time': {
      let time = value;

      // The backend send a value which has the following format: '00:45:00.000'
      // or the time picker only supports hours & minutes so we need to mutate the value
      if (value && value.split(':').length > 2) {
        time = time.split(':');
        time.pop();
        time = time.join(':');
      }

      return (
        <TimePicker
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          disabled={disabled}
          error={errorMessage}
          label={label}
          labelAction={labelAction}
          id={name}
          hint={hint}
          name={name}
          onChange={time => {
            onChange({ target: { name, value: `${time}`, type } });
          }}
          onClear={() => {
            onChange({ target: { name, value: null, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          step={step}
          value={time}
        />
      );
    }
    default: {
      return (
        <NotSupported
          name={name}
          label={label}
          labelAction={labelAction}
          hint={hint}
          error={errorMessage}
          required={required}
        />
      );
    }
  }
};

GenericInput.defaultProps = {
  autoComplete: undefined,
  customInputs: null,
  description: null,
  disabled: false,
  error: '',
  isNullable: undefined,
  labelAction: undefined,
  placeholder: null,
  required: false,
  options: [],
  step: 1,
  value: undefined,
};

GenericInput.propTypes = {
  autoComplete: PropTypes.string,
  customInputs: PropTypes.object,
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string,
    }),
  ]),
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  isNullable: PropTypes.bool,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      metadatas: PropTypes.shape({
        intlLabel: PropTypes.shape({
          id: PropTypes.string.isRequired,
          defaultMessage: PropTypes.string.isRequired,
        }).isRequired,
        disabled: PropTypes.bool,
        hidden: PropTypes.bool,
      }).isRequired,
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired
  ),
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  required: PropTypes.bool,
  step: PropTypes.number,
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default GenericInput;
