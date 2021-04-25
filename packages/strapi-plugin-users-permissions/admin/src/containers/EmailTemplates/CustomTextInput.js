/**
 *
 * The input is made so we can handle a custom descritption
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Error, Label, InputText } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import { Description, ErrorMessage } from '@buffetjs/styles';
import { getTrad } from '../../utils';
import Wrapper from './Wrapper';

const CustomTextInput = ({
  description,
  error: inputError,
  label,
  name,
  onChange,
  validations,
  value,
  ...rest
}) => {
  const inputId = name;
  const descriptionId = `description-${inputId}`;
  const errorId = `error-${inputId}`;

  const link = (
    <a
      href="https://strapi.io/documentation/developer-docs/latest/development/plugins/users-permissions.html#templating-emails"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FormattedMessage id="users-permissions.PopUpForm.Email.link.documentation" />
    </a>
  );

  const descriptionCompo = (
    <Description id={descriptionId}>
      <FormattedMessage
        id={getTrad('PopUpForm.Email.email_templates.inputDescription')}
        values={{ link }}
      />
    </Description>
  );

  return (
    <Error inputError={inputError} name={name} type="text" validations={validations}>
      {({ canCheck, onBlur, error, dispatch }) => (
        <Wrapper error={error}>
          <Label htmlFor={inputId}>{label}</Label>
          <InputText
            {...rest}
            name={name}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            onBlur={onBlur}
            onChange={e => {
              if (!canCheck) {
                dispatch({
                  type: 'SET_CHECK',
                });
              }

              dispatch({
                type: 'SET_ERROR',
                error: null,
              });
              onChange(e);
            }}
            value={value}
          />
          {!error ? descriptionCompo : <ErrorMessage id={errorId}>{error}</ErrorMessage>}
        </Wrapper>
      )}
    </Error>
  );
};

CustomTextInput.defaultProps = {
  description: null,
  id: null,
  error: null,
  label: null,
  onBlur: null,
  onChange: () => {},
  validations: {},
  value: '',
};

CustomTextInput.propTypes = {
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  error: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: () => {},

  validations: PropTypes.object,
  value: PropTypes.any,
};

export default CustomTextInput;
