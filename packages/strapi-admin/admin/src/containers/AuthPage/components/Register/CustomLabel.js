import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

const CustomLabel = ({ id, onClick, values }) => {
  const { formatMessage } = useIntl();

  return (
    <Text
      as="span"
      fontWeight="regular"
      lineHeight="18px"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {formatMessage({ id }, values)}
    </Text>
  );
};

CustomLabel.propTypes = {
  id: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
};

export default memo(CustomLabel);
