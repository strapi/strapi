// TODO DELETE THIS FILE WHEN AUTH FINISHED
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

const CustomLabel = ({ id, values }) => {
  const { formatMessage } = useIntl();

  return (
    <Text as="span" fontWeight="regular" lineHeight="18px">
      {formatMessage({ id }, values)}
    </Text>
  );
};

CustomLabel.propTypes = {
  id: PropTypes.string.isRequired,
  values: PropTypes.object.isRequired,
};

export default memo(CustomLabel);
