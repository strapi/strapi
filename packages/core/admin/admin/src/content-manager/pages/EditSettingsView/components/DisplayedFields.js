import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { Plus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

import LinkToCTB from './LinkToCTB';
import RowsLayout from './RowsLayout';

const DisplayedFields = ({ editLayout, fields, onRemoveField, onAddField }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between">
        <div>
          <Box>
            <Typography fontWeight="bold">
              {formatMessage({
                id: getTrad('containers.ListPage.displayedFields'),
                defaultMessage: 'Displayed fields',
              })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: 'containers.SettingPage.editSettings.description',
                defaultMessage: 'Drag & drop the fields to build the layout',
              })}
            </Typography>
          </Box>
        </div>
        <LinkToCTB />
      </Flex>
      <Box padding={4} hasRadius borderStyle="dashed" borderWidth="1px" borderColor="neutral300">
        <Flex direction="column" alignItems="stretch" gap={2}>
          {editLayout.map((row, index) => (
            <RowsLayout key={row.rowId} row={row} rowIndex={index} onRemoveField={onRemoveField} />
          ))}
          <Menu.Root>
            <Menu.Trigger
              startIcon={<Plus />}
              endIcon={null}
              disabled={fields.length === 0}
              fullWidth
              variant="secondary"
            >
              {formatMessage({
                id: getTrad('containers.SettingPage.add.field'),
                defaultMessage: 'Insert another field',
              })}
            </Menu.Trigger>
            <Menu.Content>
              {fields.map((field) => (
                <Menu.Item key={field} onSelect={() => onAddField(field)}>
                  {field}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Root>
        </Flex>
      </Box>
    </Flex>
  );
};

DisplayedFields.propTypes = {
  editLayout: PropTypes.array.isRequired,
  fields: PropTypes.array.isRequired,
  onAddField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};

export default DisplayedFields;
