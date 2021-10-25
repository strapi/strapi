import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { ButtonText, Text } from '@strapi/parts/Text';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Stack } from '@strapi/parts/Stack';
import { Flex } from '@strapi/parts/Flex';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { SimpleMenu, MenuItem } from '@strapi/parts/SimpleMenu';
import AddIcon from '@strapi/icons/AddIcon';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import FieldButton from './FieldButton';
import LinkToCTB from './LinkToCTB';

const DisplayedFields = ({
  attributes,
  editLayout,
  editLayoutRemainingFields,
  onRemoveField,
  onAddField,
}) => {
  const { formatMessage } = useIntl();
  const { setEditFieldToSelect } = useLayoutDnd();

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
          <Box>
            <Text small textColor="neutral600">
              {formatMessage({
                id: 'containers.SettingPage.editSettings.description',
                defaultMessage: 'Drag & drop the fields to build the layout',
              })}
            </Text>
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

                return (
                  <GridItem key={rowItem.name} col={rowItem.size}>
                    {rowItem.name !== '_TEMP_' ? (
                      <FieldButton
                        onEditField={() => setEditFieldToSelect(rowItem.name)}
                        onDeleteField={() => onRemoveField(row.rowId, index)}
                        attribute={attribute}
                      >
                        {rowItem.name}
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
            fullWidth
            startIcon={<AddIcon />}
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
  attributes: PropTypes.object.isRequired,
  onAddField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};

export default DisplayedFields;
