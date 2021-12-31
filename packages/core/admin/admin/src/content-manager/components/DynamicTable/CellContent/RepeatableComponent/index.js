import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';
import { Popover } from '@strapi/design-system/Popover';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { SortIcon, stopPropagation } from '@strapi/helper-plugin';

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

const RepeatableComponentCell = ({ value, metadatas, component }) => {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef();
  const { mainField } = metadatas;
  const type = component?.attributes?.[mainField]?.type;
  const subValues = [...value.slice(1)];

  const handleTogglePopover = () => setVisible(prev => !prev);

  return (
    <Flex {...stopPropagation}>
      <Tooltip label="Display repeatable values">
        <Button type="button" onClick={handleTogglePopover} ref={buttonRef}>
          <Flex>
            <Typography
              style={{ maxWidth: '252px', cursor: 'pointer' }}
              textColor="neutral800"
              ellipsis
            >
              <CellValue type={type} value={value?.[0]?.[mainField]} />
            </Typography>
            <ActionWrapper>
              <SortIcon />

              {visible && subValues.length > 0 && (
                <Popover source={buttonRef} spacing={16} centered>
                  <FocusTrap onEscape={handleTogglePopover}>
                    <ul>
                      {subValues.map(entry => {
                        const entryType = component?.attributes?.[mainField]?.type;

                        return (
                          <Box key={entry.id} tabIndex={0} padding={3} as="li">
                            <Typography>
                              <CellValue type={entryType} value={entry[mainField]} />
                            </Typography>
                          </Box>
                        );
                      })}
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
    mainField: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.array.isRequired,
  component: PropTypes.shape({
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export default RepeatableComponentCell;
