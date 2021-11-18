import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/design-system/IconButton';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Badge } from '@strapi/design-system/Badge';
import { Flex } from '@strapi/design-system/Flex';
import { Popover } from '@strapi/design-system/Popover';
import { SortIcon, stopPropagation } from '@strapi/helper-plugin';
import styled from 'styled-components';
import PopoverContent from './PopoverContent';
import CellValue from '../CellValue';

const SINGLE_RELATIONS = ['oneToOne', 'manyToOne'];

const ActionWrapper = styled.span`
  svg {
    height: ${4 / 16}rem;
  }
`;

const RelationCountBadge = styled(Badge)`
  display: flex;
  align-items: center;
  height: ${20 / 16}rem;
  width: ${16 / 16}rem;
`;

const Relation = ({ fieldSchema, metadatas, queryInfos, name, rowId, value }) => {
  const { formatMessage } = useIntl();
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef();

  if (SINGLE_RELATIONS.includes(fieldSchema.relation)) {
    return (
      <Typography textColor="neutral800">
        <CellValue type={metadatas.mainField.schema.type} value={value[metadatas.mainField.name]} />
      </Typography>
    );
  }

  const handleTogglePopover = () => setVisible(prev => !prev);

  return (
    <Flex {...stopPropagation}>
      <RelationCountBadge>{value.count}</RelationCountBadge>
      <Box paddingLeft={2}>
        <Typography textColor="neutral800">
          {formatMessage(
            {
              id: 'content-manager.containers.ListPage.items',
              defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
            },
            { number: value.count }
          )}
        </Typography>
      </Box>
      {value.count > 0 && (
        <ActionWrapper>
          <IconButton
            onClick={handleTogglePopover}
            ref={buttonRef}
            noBorder
            label={formatMessage({
              id: 'content-manager.popover.display-relations.label',
              defaultMessage: 'Display relations',
            })}
            icon={<SortIcon isUp={visible} />}
          />
          {visible && (
            <Popover source={buttonRef} spacing={16} centered>
              <PopoverContent
                queryInfos={queryInfos}
                name={name}
                fieldSchema={metadatas.mainField}
                targetModel={fieldSchema.targetModel}
                rowId={rowId}
                count={value.count}
              />
            </Popover>
          )}
        </ActionWrapper>
      )}
    </Flex>
  );
};

Relation.propTypes = {
  fieldSchema: PropTypes.shape({
    relation: PropTypes.string,
    targetModel: PropTypes.string,
    type: PropTypes.string.isRequired,
  }).isRequired,
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
    }),
  }).isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  queryInfos: PropTypes.shape({ endPoint: PropTypes.string.isRequired }).isRequired,
  value: PropTypes.object.isRequired,
};

export default Relation;
