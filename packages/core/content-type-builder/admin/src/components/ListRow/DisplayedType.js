import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import getTrad from '../../utils/getTrad';

const DisplayedType = ({ type, customField, repeatable }) => {
  const { formatMessage } = useIntl();

  let readableType = type;

  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  if (customField) {
    return (
      <Typography>
        {formatMessage({
          id: getTrad('attribute.customField'),
          defaultMessage: 'Custom field',
        })}
      </Typography>
    );
  }

  return (
    <Typography>
      {formatMessage({
        id: getTrad(`attribute.${readableType}`),
        defaultMessage: type,
      })}
      &nbsp;
      {repeatable &&
        formatMessage({
          id: getTrad('component.repeatable'),
          defaultMessage: '(repeatable)',
        })}
    </Typography>
  );
};

DisplayedType.defaultProps = {
  customField: null,
  repeatable: false,
};

DisplayedType.propTypes = {
  type: PropTypes.string.isRequired,
  customField: PropTypes.bool,
  repeatable: PropTypes.bool,
};

export default DisplayedType;
