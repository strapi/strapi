import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader, ModalBody } from '@strapi/design-system/ModalLayout';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { Grid } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { pxToRem } from '@strapi/helper-plugin';
import getDefaultMessage from '../utils/getActionTypesDefaultMessages';
import useFormatTimeStamp from '../hooks/useFormatTimeStamp';
import ActionItem from './ActionItem';

const ModalDialog = ({ onToggle, data: { date, user, action } }) => {
  const { formatMessage } = useIntl();
  const formatTimeStamp = useFormatTimeStamp();
  const formattedDate = formatTimeStamp(date);

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={formattedDate}>
          <Crumb>{formattedDate}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>
        <Box marginBottom={pxToRem(12)}>
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
          background="neutral100"
          hasRadius
        >
          <ActionItem
            actionLabel={formatMessage({
              id: 'Settings.permissions.auditLogs.action',
              defaultMessage: 'Action',
            })}
            actionName={formatMessage({
              id: `Settings.permissions.auditLogs.${action}`,
              defaultMessage: getDefaultMessage(action),
            })}
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
            actionName={user ? user.fullname : '-'}
          />
        </Grid>
      </ModalBody>
    </ModalLayout>
  );
};

ModalDialog.propTypes = {
  onToggle: PropTypes.func.isRequired,
  data: PropTypes.object.isRequired,
};

export default ModalDialog;
