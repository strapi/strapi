import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import Plus from '@strapi/icons/Plus';
import { getTrad } from '../../../utils';
import RowsLayout from './RowsLayout';
import LinkToCTB from './LinkToCTB';

const DisplayedFields = ({ editLayout, editLayoutRemainingFields, onRemoveField, onAddField }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack spacing={4}>
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
        <Stack spacing={2}>
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
            disabled={editLayoutRemainingFields.length === 0}
          >
            {editLayoutRemainingFields.map((field) => (
              <MenuItem key={field} onClick={() => onAddField(field)}>
                {field}
              </MenuItem>
            ))}
          </SimpleMenu>
        </Stack>
      </Box>
    </Stack>
  );
};

DisplayedFields.propTypes = {
  editLayout: PropTypes.array.isRequired,
  editLayoutRemainingFields: PropTypes.array.isRequired,
  onAddField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};

export default DisplayedFields;
