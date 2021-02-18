/**
 *
 * Switch
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';

import Toggle from './Toggle';
import Wrapper from './Wrapper';

function Switch({ disabled, name, value, onChange }) {
  const { formatMessage } = useGlobalContext();

  return (
    <Wrapper>
      <Toggle
        disabled={disabled}
        checked={value}
        name={name}
        onChange={({ target: { checked } }) => onChange({ target: { name, value: checked } })}
      />
      <div className="button">
        <div className="button-rect" />
        <div className="button-circle" />
      </div>
      <p>
        {value
          ? formatMessage({ id: 'Settings.webhooks.enabled' })
          : formatMessage({ id: 'Settings.webhooks.disabled' })}
      </p>
    </Wrapper>
  );
}

Switch.defaultProps = {
  disabled: true,
  onChange: () => {},
  value: false,
};

Switch.propTypes = {
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  name: PropTypes.string.isRequired,
  value: PropTypes.bool,
};

export default Switch;
