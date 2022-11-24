import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const ActionItem = ({ actionLabel, actionName }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="baseline" gap={1}>
      <Typography textColor="neutral600" variant="sigma">
        {formatMessage(actionLabel)}
      </Typography>
      <Typography textColor="neutral600">{actionName}</Typography>
    </Flex>
  );
};

ActionItem.propTypes = {
  actionLabel: PropTypes.object.isRequired,
  actionName: PropTypes.string.isRequired,
};

export default ActionItem;
