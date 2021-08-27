import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Checkbox, Text } from '@buffetjs/core';
import { ModalConfirm } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';
import Wrapper from './Wrapper';

const CheckboxConfirmation = ({ description, isCreating, label, name, onChange, ...rest }) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = e => {
    if (isCreating || e.target.value) {
      return onChange(e);
    }

    if (!e.target.value) {
      return setIsOpen(true);
    }

    return null;
  };

  const handleConfirm = () => {
    onChange({ target: { name, value: false, type: 'checkbox' } });
    setIsOpen(false);
  };

  const handleToggle = () => setIsOpen(prev => !prev);

  return (
    <>
      <Wrapper>
        <Checkbox {...rest} message={label} name={name} onChange={handleChange} type="checkbox" />
        {description && (
          <Text color="grey" title={description} fontSize="sm" ellipsis>
            {description}
          </Text>
        )}
      </Wrapper>
      <ModalConfirm
        confirmButtonLabel={{ id: getTrad('CheckboxConfirmation.Modal.button-confirm') }}
        content={{ id: getTrad('CheckboxConfirmation.Modal.content') }}
        isOpen={isOpen}
        toggle={handleToggle}
        onConfirm={handleConfirm}
      >
        <Text fontWeight="bold">
          {formatMessage({ id: getTrad('CheckboxConfirmation.Modal.body') })}
        </Text>
      </ModalConfirm>
    </>
  );
};

CheckboxConfirmation.defaultProps = {
  description: null,
  isCreating: false,
};

CheckboxConfirmation.propTypes = {
  description: PropTypes.string,
  label: PropTypes.string.isRequired,
  isCreating: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default CheckboxConfirmation;
