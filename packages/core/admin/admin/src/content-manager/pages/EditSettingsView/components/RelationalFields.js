import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { ButtonText, Text } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import { SimpleMenu, MenuItem } from '@strapi/parts/SimpleMenu';
import AddIcon from '@strapi/icons/AddIcon';
import { getTrad } from '../../../utils';
import FieldButton from './FieldButton';

const RelationalFields = ({
  relationsLayout,
  editRelationsLayoutRemainingFields,
  onRemoveField,
  onAddField,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={4}>
      <div>
        <Box>
          <ButtonText>
            {formatMessage({
              id: getTrad('containers.SettingPage.relations'),
              defaultMessage: 'Relational fields',
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
      <Box padding={4} hasRadius borderStyle="dashed" borderWidth="1px" borderColor="neutral300">
        <Stack size={2}>
          {relationsLayout.map((relationName, index) => (
            <FieldButton
              onEditField={() => console.log(relationName)}
              onDeleteField={() => onRemoveField(index)}
              key={relationName}
            >
              {relationName}
            </FieldButton>
          ))}
          <SimpleMenu
            id="label"
            label={formatMessage({
              id: 'containers.SettingPage.add.relational-field',
              defaultMessage: 'Insert another relational field',
            })}
            as={Button}
            fullWidth
            startIcon={<AddIcon />}
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
