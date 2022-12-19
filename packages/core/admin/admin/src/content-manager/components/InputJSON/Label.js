import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FieldLabel } from '@strapi/design-system/Field';

const Label = ({ intlLabel, name }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return <FieldLabel>{label}</FieldLabel>;
};

Label.defaultProps = {
  id: undefined,
  intlLabel: undefined,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  name: PropTypes.string.isRequired,
};

export default Label;
