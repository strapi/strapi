import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import Plus from '@strapi/icons/Plus';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import RelationalFieldButton from './RelationalFieldButton';

const RelationalFields = ({
  relationsLayout,
  editRelationsLayoutRemainingFields,
  onRemoveField,
  onAddField,
}) => {
  const { formatMessage } = useIntl();
  const { setEditFieldToSelect, modifiedData, onMoveRelation } = useLayoutDnd();

  return (
    <Stack size={4}>
      <div>
        <Box>
          <Typography fontWeight="bold">
            {formatMessage({
              id: getTrad('containers.SettingPage.relations'),
              defaultMessage: 'Relational fields',
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
      <Box padding={4} hasRadius borderStyle="dashed" borderWidth="1px" borderColor="neutral300">
        <Stack size={2}>
          {relationsLayout.map((relationName, index) => {
            const relationLabel = get(
              modifiedData,
              ['metadatas', relationName, 'edit', 'label'],
              ''
            );

            return (
              <RelationalFieldButton
                onEditField={() => setEditFieldToSelect(relationName)}
                onDeleteField={() => onRemoveField(index)}
                key={relationName}
                index={index}
                name={relationName}
                onMoveField={onMoveRelation}
              >
                {relationLabel || relationName}
              </RelationalFieldButton>
            );
          })}
          <SimpleMenu
            id="label"
            label={formatMessage({
              id: 'containers.SettingPage.add.relational-field',
              defaultMessage: 'Insert another relational field',
            })}
            data-testid="add-relation"
            as={Button}
            fullWidth
            startIcon={<Plus />}
            endIcon={null}
            variant="secondary"
            disabled={editRelationsLayoutRemainingFields.length === 0}
          >
            {editRelationsLayoutRemainingFields.map(remainingRelation => (
              <MenuItem
                id={`menuItem-${remainingRelation}`}
                key={`menuItem-${remainingRelation}`}
                onClick={() => onAddField(remainingRelation)}
              >
                {remainingRelation}
              </MenuItem>
            ))}
          </SimpleMenu>
        </Stack>
      </Box>
    </Stack>
  );
};

RelationalFields.propTypes = {
  relationsLayout: PropTypes.array.isRequired,
  editRelationsLayoutRemainingFields: PropTypes.array.isRequired,
  onRemoveField: PropTypes.func.isRequired,
  onAddField: PropTypes.func.isRequired,
};

export default RelationalFields;
