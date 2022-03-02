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
  value,
  ...rest
}) => {
  const { formatMessage } = useIntl();
  const [showPassword, setShowPassword] = useState(false);

  const CustomInput = customInputs ? customInputs[type] : null;

  if (CustomInput) {
    return (
      <CustomInput
        {...rest}
        description={description}
        disabled={disabled}
        intlLabel={intlLabel}
        labelAction={labelAction}
        error={error}
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

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  switch (type) {
    case 'bool': {
      return (
        <ToggleInput
          checked={value === null ? null : value || false}
          disabled={disabled}
          hint={hint}
          label={label}
          labelAction={labelAction}
          name={name}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'Off',
          })}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'On',
          })}
          onChange={e => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          required={required}
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
          value={value ? new Date(value) : null}
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
            onChange({ target: { name, value, type } });
          }}
          placeholder={formattedPlaceholder}
          required={required}
          step={step}
          value={value ?? undefined}
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
          value={value || ''}
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
          value={value || ''}
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
          value={value || ''}
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
          value={value || ''}
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
          value={value || ''}
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
  labelAction: undefined,
  placeholder: null,
  required: false,
  options: [],
  step: 1,
  value: '',
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
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
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
