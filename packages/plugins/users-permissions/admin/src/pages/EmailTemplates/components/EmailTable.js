import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  IconButton,
  Icon,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Refresh, Check } from '@strapi/icons';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
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
        <Tr {...onRowClick({ fn: () => onEditClick('reset_password') })}>
          <Td>
            <Icon>
              <Refresh
                aria-label={formatMessage({
                  id: 'global.reset-password',
                  defaultMessage: 'Reset password',
                })}
              />
            </Icon>
          </Td>
          <Td>
            <Typography>
              {formatMessage({
                id: 'global.reset-password',
                defaultMessage: 'Reset password',
              })}
            </Typography>
          </Td>
          <Td {...stopPropagation}>
            <IconButton
              onClick={() => onEditClick('reset_password')}
              label={formatMessage({
                id: getTrad('Email.template.form.edit.label'),
                defaultMessage: 'Edit a template',
              })}
              noBorder
              icon={canUpdate && <Pencil />}
            />
          </Td>
        </Tr>
        <Tr {...onRowClick({ fn: () => onEditClick('email_confirmation') })}>
          <Td>
            <Icon>
              <Check
                aria-label={formatMessage({
                  id: getTrad('Email.template.email_confirmation'),
                  defaultMessage: 'Email address confirmation',
                })}
              />
            </Icon>
          </Td>
          <Td>
            <Typography>
              {formatMessage({
                id: getTrad('Email.template.email_confirmation'),
                defaultMessage: 'Email address confirmation',
              })}
            </Typography>
          </Td>
          <Td {...stopPropagation}>
            <IconButton
              onClick={() => onEditClick('email_confirmation')}
              label={formatMessage({
                id: getTrad('Email.template.form.edit.label'),
                defaultMessage: 'Edit a template',
              })}
              noBorder
              icon={canUpdate && <Pencil />}
            />
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
