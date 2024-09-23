import React from 'react';

import {
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
  Box,
} from '@strapi/design-system';
import { Check, Pencil, ArrowClockwise as Refresh } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

const EmailTable = ({ canUpdate, onEditClick }) => {
  const { formatMessage } = useIntl();

  return (
    <Table colCount={3} rowCount={3}>
      <Thead>
        <Tr>
          <Th width="1%">
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('Email.template.table.icon.label'),
                defaultMessage: 'icon',
              })}
            </VisuallyHidden>
          </Th>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTrad('Email.template.table.name.label'),
                defaultMessage: 'name',
              })}
            </Typography>
          </Th>
          <Th width="1%">
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('Email.template.table.action.label'),
                defaultMessage: 'action',
              })}
            </VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr onClick={() => onEditClick('reset_password')}>
          <Td>
            <Box width="3.2rem" height="3.2rem" padding="0.8rem">
              <Refresh
                aria-label={formatMessage({
                  id: 'global.reset-password',
                  defaultMessage: 'Reset password',
                })}
              />
            </Box>
          </Td>
          <Td>
            <Typography>
              {formatMessage({
                id: 'global.reset-password',
                defaultMessage: 'Reset password',
              })}
            </Typography>
          </Td>
          <Td onClick={(e) => e.stopPropagation()}>
            <IconButton
              onClick={() => onEditClick('reset_password')}
              label={formatMessage({
                id: getTrad('Email.template.form.edit.label'),
                defaultMessage: 'Edit a template',
              })}
              variant="ghost"
              disabled={!canUpdate}
            >
              <Pencil />
            </IconButton>
          </Td>
        </Tr>
        <Tr onClick={() => onEditClick('email_confirmation')}>
          <Td>
            <Box width="3.2rem" height="3.2rem" padding="0.8rem">
              <Check
                aria-label={formatMessage({
                  id: getTrad('Email.template.email_confirmation'),
                  defaultMessage: 'Email address confirmation',
                })}
              />
            </Box>
          </Td>
          <Td>
            <Typography>
              {formatMessage({
                id: getTrad('Email.template.email_confirmation'),
                defaultMessage: 'Email address confirmation',
              })}
            </Typography>
          </Td>
          <Td onClick={(e) => e.stopPropagation()}>
            <IconButton
              onClick={() => onEditClick('email_confirmation')}
              label={formatMessage({
                id: getTrad('Email.template.form.edit.label'),
                defaultMessage: 'Edit a template',
              })}
              variant="ghost"
              disabled={!canUpdate}
            >
              <Pencil />
            </IconButton>
          </Td>
        </Tr>
      </Tbody>
    </Table>
  );
};

EmailTable.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
  onEditClick: PropTypes.func.isRequired,
};

export default EmailTable;
