import React from 'react';

import { Badge, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import CellValue from '../CellValue';

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

const RepeatableComponentCell = ({ value, metadatas }) => {
  const { formatMessage } = useIntl();
  const {
    mainField: { type: mainFieldType, name: mainFieldName },
  } = metadatas;

  return (
    <Menu.Root>
      <MenuTrigger onClick={(e) => e.stopPropagation()}>
        <Badge>{value.length}</Badge>{' '}
        {formatMessage(
          {
            id: 'content-manager.containers.ListPage.items',
            defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
          },
          { number: value.length }
        )}
      </MenuTrigger>
      <Menu.Content>
        {value.map((item) => (
          <Menu.Item key={item.id} disabled>
            <TypographyMaxWidth ellipsis>
              <CellValue type={mainFieldType} value={item[mainFieldName] || item.id} />
            </TypographyMaxWidth>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
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

/**
 * TODO: this needs to be solved in the Design-System
 */
const MenuTrigger = styled(Menu.Trigger)`
  svg {
    width: ${6 / 16}rem;
    height: ${4 / 16}rem;
  }
`;

export default RepeatableComponentCell;
