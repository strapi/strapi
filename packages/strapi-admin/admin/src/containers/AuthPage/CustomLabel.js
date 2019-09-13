import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

const CustomLabel = ({ id, values }) => (
  <FormattedMessage id={id} values={values} />
);

CustomLabel.propTypes = {
  id: PropTypes.string.isRequired,
  values: PropTypes.object.isRequired,
};

export default memo(CustomLabel);
