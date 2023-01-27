import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Badge } from '@strapi/design-system/Badge';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { stopPropagation } from '@strapi/helper-plugin';

import CellValue from '../CellValue';

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

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
      <SimpleMenu label={Label} size="S">
        {value.map((item) => (
          <MenuItem key={item.id} aria-disabled>
            <TypographyMaxWidth ellipsis>
              <CellValue type={mainFieldType} value={item[mainFieldName] || item.id} />
            </TypographyMaxWidth>
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
