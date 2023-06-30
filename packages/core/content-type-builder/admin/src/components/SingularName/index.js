/**
 *
 * SingularName
 *
 */

import React, { useEffect, useRef } from 'react';

import { TextInput } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import nameToSlug from '../../utils/nameToSlug';

const SingularName = ({ description, error, intlLabel, modifiedData, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const onChangeRef = useRef(onChange);
  const displayName = modifiedData?.displayName || '';

  useEffect(() => {
    if (displayName) {
      onChangeRef.current({ target: { name, value: nameToSlug(displayName) } });
    } else {
      onChangeRef.current({ target: { name, value: '' } });
    }
  }, [displayName, name]);

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';
  const label = formatMessage(intlLabel);

  return (
    <TextInput
      error={errorMessage}
      label={label}
      id={name}
      hint={hint}
      name={name}
      onChange={onChange}
      value={value || ''}
    />
  );
};

SingularName.defaultProps = {
  description: null,
  error: null,
  value: null,
};

SingularName.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default SingularName;
