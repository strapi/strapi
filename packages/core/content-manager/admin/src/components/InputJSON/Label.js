import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FieldLabel } from '@strapi/design-system/Field';

const Label = ({ intlLabel, labelAction, name }) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return <FieldLabel action={labelAction}>{label}</FieldLabel>;
};

Label.defaultProps = {
  id: undefined,
  intlLabel: undefined,
  labelAction: undefined,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
};

export default Label;
