/**
 *
 * PluralName
 *
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import pluralize from 'pluralize';
import { TextInput } from '@strapi/design-system/TextInput';
import nameToSlug from '../../utils/nameToSlug';

const PluralName = ({ description, error, intlLabel, modifiedData, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const onChangeRef = useRef(onChange);
  const displayName = modifiedData?.displayName || '';

  useEffect(() => {
    if (displayName) {
      const value = nameToSlug(displayName);

      try {
        const plural = pluralize(value, 2);
        onChangeRef.current({ target: { name, value: plural } });
      } catch (err) {
        onChangeRef.current({ target: { name, value } });
      }
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

PluralName.defaultProps = {
  description: null,
  error: null,
  value: null,
};

PluralName.propTypes = {
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

export default PluralName;
