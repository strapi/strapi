import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import Plus from '@strapi/icons/Plus';
import { getTrad, ItemTypes } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import FieldButton from './FieldButton';
import LinkToCTB from './LinkToCTB';

const DisplayedFields = ({ editLayout, editLayoutRemainingFields, onRemoveField, onAddField }) => {
  const { formatMessage } = useIntl();
  const { setEditFieldToSelect, attributes, modifiedData, onMoveField } = useLayoutDnd();

  return (
    <Stack size={4}>
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
        <Stack size={2}>
          {editLayout.map(row => (
            <Grid gap={4} key={row.rowId}>
              {row.rowContent.map((rowItem, index) => {
                const attribute = get(attributes, [rowItem.name], {});
                const attributeLabel = get(
                  modifiedData,
                  ['metadatas', rowItem.name, 'edit', 'label'],
                  ''
                );

                return (
                  <GridItem key={rowItem.name} col={rowItem.size}>
                    {rowItem.name !== '_TEMP_' ? (
                      <FieldButton
                        onEditField={() => setEditFieldToSelect(rowItem.name)}
                        onDeleteField={() => onRemoveField(row.rowId, index)}
                        attribute={attribute}
                        itemType={ItemTypes.EDIT_RELATION}
                        index={index}
                        name={rowItem.name}
                        onMoveField={onMoveField}
                      >
                        {attributeLabel || rowItem.name}
                      </FieldButton>
                    ) : (
                      <VisuallyHidden />
                    )}
                  </GridItem>
                );
              })}
            </Grid>
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
            {editLayoutRemainingFields.map(field => (
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
