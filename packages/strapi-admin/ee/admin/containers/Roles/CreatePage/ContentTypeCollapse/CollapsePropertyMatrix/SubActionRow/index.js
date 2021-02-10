import React, { memo, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import CollapseLabel from '../../../CollapseLabel';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import Curve from './Curve';
import { RowStyle, RowWrapper } from './row';
import { LeftBorderTimeline, TopTimeline } from './timeline';
import Wrapper from './Wrapper';

const SubLevelWrapper = styled.div`
  padding-bottom: 8px;
`;

const SubActionRow = ({ recursiveLevel, values, propertyActions }) => {
  const [rowToOpen, setRowToOpen] = useState(null);
  const handleClickToggleSubLevel = useCallback(name => {
    setRowToOpen(prev => {
      if (prev === name) {
        return null;
      }

      return name;
    });
  }, []);

  const displayedRecursiveValue = useMemo(() => {
    if (!rowToOpen) {
      return null;
    }

    return values.find(({ value }) => value === rowToOpen);
  }, [rowToOpen, values]);

  return (
    <Wrapper>
      <TopTimeline />
      {values.map((value, index) => {
        const isVisible = index + 1 < values.length;
        const isArrayType = Array.isArray(value.value);
        const isSmall = isArrayType || index + 1 === values.length;
        const isActive = rowToOpen === value.value;

        return (
          <LeftBorderTimeline key={value.key} isVisible={isVisible}>
            <RowWrapper isSmall={isSmall}>
              <Curve fill="#a5d5ff" />
              <Flex style={{ flex: 1 }}>
                <RowStyle level={recursiveLevel} isActive={isActive} isCollapsable={isArrayType}>
                  <CollapseLabel
                    alignItems="center"
                    isCollapsable={isArrayType}
                    onClick={() => {
                      if (isArrayType) {
                        handleClickToggleSubLevel(value.value);
                      }
                    }}
                    title={value.key}
                  >
                    <Text
                      color={isActive ? 'mediumBlue' : 'grey'}
                      ellipsis
                      fontSize="xs"
                      fontWeight="bold"
                      lineHeight="20px"
                      textTransform="uppercase"
                    >
                      {value.key}
                    </Text>
                    {value.required && <RequiredSign>*</RequiredSign>}
                    <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
                  </CollapseLabel>
                </RowStyle>
                <Flex style={{ flex: 1 }}>
                  {propertyActions.map(action => {
                    if (!action.isActionRelatedToCurrentProperty) {
                      return <HiddenAction key={action.label} />;
                    }

                    return <CheckboxWithCondition key={action.label} name="todo" />;
                  })}
                </Flex>
              </Flex>
            </RowWrapper>
            {displayedRecursiveValue && isActive && (
              <SubLevelWrapper>
                <SubActionRow
                  name={displayedRecursiveValue.key}
                  propertyActions={propertyActions}
                  recursiveLevel={recursiveLevel + 1}
                  values={displayedRecursiveValue.value}
                />
              </SubLevelWrapper>
            )}
          </LeftBorderTimeline>
        );
      })}
    </Wrapper>
  );
};

SubActionRow.defaultProps = {
  recursiveLevel: 0,
};

SubActionRow.propTypes = {
  propertyActions: PropTypes.array.isRequired,
  recursiveLevel: PropTypes.number,
  values: PropTypes.array.isRequired,
};

export default memo(SubActionRow);
