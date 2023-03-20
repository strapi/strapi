import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button, Box, Typography, Flex, SimpleMenu, MenuItem } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { getTrad } from '../../../utils';
import RowsLayout from './RowsLayout';
import LinkToCTB from './LinkToCTB';

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
          <SimpleMenu
            id="label"
            label={formatMessage({
              id: getTrad('containers.SettingPage.add.field'),
              defaultMessage: 'Insert another field',
            })}
            as={Button}
            data-testid="add-field"
            fullWidth
            startIcon={<Plus />}
            endIcon={null}
            variant="secondary"
            disabled={fields.length === 0}
          >
            {fields.map((field) => (
              <MenuItem key={field} onClick={() => onAddField(field)}>
                {field}
              </MenuItem>
            ))}
          </SimpleMenu>
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
