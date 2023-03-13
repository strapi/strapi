import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Loader, Grid, Box, Flex, Typography, JSONInput } from '@strapi/design-system';
import { getDefaultMessage } from '../utils/getActionTypesDefaultMessages';
import ActionItem from './ActionItem';

const ActionBody = ({ status, data, formattedDate }) => {
  const { formatMessage } = useIntl();

  if (status === 'loading') {
    return (
      <Flex padding={7} justifyContent="center" alignItems="center">
        <Loader>Loading content...</Loader>
      </Flex>
    );
  }

  const { action, user, payload } = data;

  return (
    <>
      <Box marginBottom={3}>
        <Typography variant="delta" id="title">
          {formatMessage({
            id: 'Settings.permissions.auditLogs.details',
            defaultMessage: 'Log Details',
          })}
        </Typography>
      </Box>
      <Grid
        gap={4}
        gridCols={2}
        paddingTop={4}
        paddingBottom={4}
        paddingLeft={6}
        paddingRight={6}
        marginBottom={4}
        background="neutral100"
        hasRadius
      >
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.action',
            defaultMessage: 'Action',
          })}
          actionName={formatMessage(
            {
              id: `Settings.permissions.auditLogs.${action}`,
              defaultMessage: getDefaultMessage(action),
            },
            { model: payload?.model }
          )}
        />
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.date',
            defaultMessage: 'Date',
          })}
          actionName={formattedDate}
        />
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.user',
            defaultMessage: 'User',
          })}
          actionName={user?.displayName || '-'}
        />
        <ActionItem
          actionLabel={formatMessage({
            id: 'Settings.permissions.auditLogs.userId',
            defaultMessage: 'User ID',
          })}
          actionName={user?.id.toString() || '-'}
        />
      </Grid>
      <JSONInput
        value={JSON.stringify(payload, null, 2)}
        disabled
        label={formatMessage({
          id: 'Settings.permissions.auditLogs.payload',
          defaultMessage: 'Payload',
        })}
      />
    </>
  );
};

ActionBody.defaultProps = {
  data: {},
};

ActionBody.propTypes = {
  status: PropTypes.oneOf(['idle', 'loading', 'error', 'success']).isRequired,
  data: PropTypes.shape({
    action: PropTypes.string,
    date: PropTypes.string,
    payload: PropTypes.object,
    user: PropTypes.object,
  }),
  formattedDate: PropTypes.string.isRequired,
};

export default ActionBody;
