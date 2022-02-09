import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';
import { Popover } from '@strapi/design-system/Popover';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { SortIcon, stopPropagation } from '@strapi/helper-plugin';
import { getTrad } from '../../../../utils';

import CellValue from '../CellValue';

const Button = styled.button`
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
  &:hover {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }
  &:active {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral400};
      }
    }
  }
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${32 / 16}rem;
  width: ${32 / 16}rem;
  svg {
    height: ${4 / 16}rem;
  }
`;

const RepeatableComponentCell = ({ value, metadatas }) => {
  const [visible, setVisible] = useState(false);
  const { formatMessage } = useIntl();
  const buttonRef = useRef();
  const {
    mainField: { type: mainFieldType, name: mainFieldName },
  } = metadatas;
  const subItems = [...value.slice(1)];

  const handleTogglePopover = () => setVisible(prev => !prev);

  return (
    <Flex {...stopPropagation}>
      <Tooltip
        label={formatMessage({
          id: getTrad('DynamicTable.component.repeatable.toggle'),
          defaultMessage: 'Toggle repeatable values',
        })}
      >
        <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
          <Flex>
            <Typography
              style={{ maxWidth: '252px', cursor: 'pointer' }}
              textColor="neutral800"
              ellipsis
            >
              <CellValue type={mainFieldType} value={value[0][mainFieldName] || '[TBD]'} />
            </Typography>
            <ActionWrapper>
              <SortIcon />

              {visible && subItems.length > 0 && (
                <Popover source={buttonRef} spacing={16} centered>
                  <FocusTrap onEscape={handleTogglePopover}>
                    <ul>
                      {subItems.map(item => (
                        <Box key={item.id} tabIndex={0} padding={3} as="li">
                          <Typography>
                            <CellValue type={mainFieldType} value={item[mainFieldName]} />
                          </Typography>
                        </Box>
                      ))}
                    </ul>
                  </FocusTrap>
                </Popover>
              )}
            </ActionWrapper>
          </Flex>
        </Button>
      </Tooltip>
    </Flex>
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
