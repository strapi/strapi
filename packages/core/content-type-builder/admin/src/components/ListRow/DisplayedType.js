import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import getTrad from '../../utils/getTrad';

const DisplayedType = ({ readableType, customField, repeatable }) => {
  const { formatMessage } = useIntl();

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
        defaultMessage: readableType,
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
  readableType: PropTypes.string.isRequired,
  customField: PropTypes.bool,
  repeatable: PropTypes.bool,
};

export default DisplayedType;
