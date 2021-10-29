import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { ButtonText } from '@strapi/design-system/Text';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import Plus from '@strapi/icons/Plus';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import FieldButton from './FieldButton';
import LinkToCTB from './LinkToCTB';

const DisplayedFields = ({ editLayout, editLayoutRemainingFields, onRemoveField, onAddField }) => {
  const { formatMessage } = useIntl();
  const { setEditFieldToSelect, attributes, modifiedData } = useLayoutDnd();

  return (
    <Stack size={4}>
      <Flex justifyContent="space-between">
        <div>
          <Box>
            <ButtonText>
              {formatMessage({
                id: getTrad('containers.ListPage.displayedFields'),
                defaultMessage: 'Displayed fields',
              })}
            </ButtonText>
          </Box>
          {/* Since the drag n drop will not be available, this text will be hidden for the moment */}
          {/* <Box>
            <Text small textColor="neutral600">
              {formatMessage({
                id: 'containers.SettingPage.editSettings.description',
                defaultMessage: 'Drag & drop the fields to build the layout',
              })}
            </Text>
          </Box> */}
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
