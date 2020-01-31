import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import { InputsIndex as Inputs } from 'strapi-helper-plugin';
import CustomLabel from './CustomLabel';

/* eslint-disable */

const Input = ({
  autoFocus,
  customBootstrapClass,
  didCheckErrors,
  errors,
  label,
  name,
  noErrorsDescription,
  onChange,
  placeholder,
  type,
  value,
}) => {
  let inputLabel = label;

  if (name === 'news') {
    const handleClick = (e, to) => {
      e.preventDefault();
      e.stopPropagation();

      const win = window.open(`https://strapi.io/${to}`, '_blank');
      win.focus();
    };

    const terms = (
      <FormattedMessage id="Auth.privacy-policy-agreement.terms">
        {content => (
          <span
            style={{ color: '#0097f7', cursor: 'pointer' }}
            onClick={e => handleClick(e, 'terms')}
          >
            {content}
          </span>
        )}
      </FormattedMessage>
    );
    const policy = (
      <FormattedMessage id="Auth.privacy-policy-agreement.policy">
        {content => (
          <span
            style={{ color: '#0097f7', cursor: 'pointer' }}
            onClick={e => handleClick(e, 'privacy')}
          >
            {content}
          </span>
        )}
      </FormattedMessage>
    );

    // eslint-disable-next-line react/display-name
    inputLabel = () => <CustomLabel id={label.id} values={{ terms, policy }} />;
  }

  const inputErrors = get(errors, name, null);

  return (
    <Inputs
      autoFocus={autoFocus}
      customBootstrapClass={customBootstrapClass || 'col-12'}
      didCheckErrors={didCheckErrors}
      errors={inputErrors ? [inputErrors] : []}
      label={inputLabel}
      name={name}
      noErrorsDescription={noErrorsDescription}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      validations={{ required: true }}
      value={value}
    />
  );
};

Input.propTypes = {
  autoFocus: PropTypes.bool,
  customBootstrapClass: PropTypes.string,
  didCheckErrors: PropTypes.bool.isRequired,
  errors: PropTypes.object.isRequired,
  label: PropTypes.object,
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default memo(Input);
