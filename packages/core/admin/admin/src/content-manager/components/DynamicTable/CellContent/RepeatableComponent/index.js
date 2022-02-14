import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { stopPropagation } from '@strapi/helper-plugin';

import CellValue from '../CellValue';

function getMainFieldValue(field, name) {
  return field[name] || field.id;
}

function getMainFieldType(field, name, defaultType) {
  if (field[name]) {
    return defaultType;
  }

  return 'text';
}

const RepeatableComponentCell = ({ value, metadatas }) => {
  const { formatMessage } = useIntl();
  const {
    mainField: { type: mainFieldType, name: mainFieldName },
  } = metadatas;

  const Label = (
    <>
      <Badge>{value.length}</Badge>{' '}
      {formatMessage(
        {
          id: 'content-manager.containers.ListPage.items',
          defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
        },
        { number: value.length }
      )}
    </>
  );

  return (
    <Box {...stopPropagation}>
      <SimpleMenu label={Label}>
        {value.map(item => (
          <MenuItem key={item.id} aria-disabled>
            <Typography>
              <CellValue
                type={getMainFieldType(item, mainFieldName, mainFieldType)}
                value={getMainFieldValue(item, mainFieldName)}
              />
            </Typography>
          </MenuItem>
        ))}
      </SimpleMenu>
    </Box>
  );
};

RepeatableComponentCell.propTypes = {
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string,
      value: PropTypes.string,
    }),
  }).isRequired,
  value: PropTypes.array.isRequired,
};

export default RepeatableComponentCell;
