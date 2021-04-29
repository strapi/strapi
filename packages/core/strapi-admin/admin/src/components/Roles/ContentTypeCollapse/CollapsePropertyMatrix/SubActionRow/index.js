import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';
import IS_DISABLED from 'ee_else_ce/components/Roles/ContentTypeCollapse/CollapsePropertyMatrix/SubActionRow/utils/constants';
import { usePermissionsDataManager } from '../../../../../hooks';
import { getCheckboxState } from '../../../utils';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import CollapseLabel from '../../../CollapseLabel';
import Curve from '../../../Curve';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import { RowStyle, RowWrapper } from './row';
import { LeftBorderTimeline, TopTimeline } from './timeline';
import Wrapper from './Wrapper';

const SubLevelWrapper = styled.div`
  padding-bottom: 8px;
`;

const SubActionRow = ({
  childrenForm,
  isFormDisabled,
  recursiveLevel,
  pathToDataFromActionRow,
  propertyActions,
  parentName,
  propertyName,
}) => {
  const {
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();
  const [rowToOpen, setRowToOpen] = useState(null);

  const handleClickToggleSubLevel = name => {
    setRowToOpen(prev => {
      if (prev === name) {
        return null;
      }

      return name;
    });
  };

  const displayedRecursiveChildren = useMemo(() => {
    if (!rowToOpen) {
      return null;
    }

    return childrenForm.find(({ value }) => value === rowToOpen);
  }, [rowToOpen, childrenForm]);

  return (
    <Wrapper>
      <TopTimeline />
      {childrenForm.map(({ label, value, required, children: subChildrenForm }, index) => {
        const isVisible = index + 1 < childrenForm.length;
        const isArrayType = Array.isArray(subChildrenForm);
        const isSmall = isArrayType || index + 1 === childrenForm.length;
        const isActive = rowToOpen === value;

        return (
          <LeftBorderTimeline key={value} isVisible={isVisible}>
            <RowWrapper isSmall={isSmall}>
              <Curve fill="#a5d5ff" />
              <Flex style={{ flex: 1 }}>
                <RowStyle level={recursiveLevel} isActive={isActive} isCollapsable={isArrayType}>
                  <CollapseLabel
                    alignItems="center"
                    isCollapsable={isArrayType}
                    onClick={() => {
                      if (isArrayType) {
                        handleClickToggleSubLevel(value);
                      }
                    }}
                    title={label}
                  >
                    <Text
                      color={isActive ? 'mediumBlue' : 'grey'}
                      ellipsis
                      fontSize="xs"
                      fontWeight="bold"
                      lineHeight="20px"
                      textTransform="uppercase"
                    >
                      {label}
                    </Text>
                    {required && <RequiredSign />}
                    <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
                  </CollapseLabel>
                </RowStyle>
                <Flex style={{ flex: 1 }}>
                  {propertyActions.map(({ actionId, label, isActionRelatedToCurrentProperty }) => {
                    if (!isActionRelatedToCurrentProperty) {
                      return <HiddenAction key={actionId} />;
                    }
                    /*
                     * Usually we use a 'dot' in order to know the key path of an object for which we want to change the value.
                     * Since an action and a subject are both separated by '.' or '::' we chose to use the '..' separators
                     */
                    const checkboxName = [
                      ...pathToDataFromActionRow.split('..'),
                      actionId,
                      'properties',
                      propertyName,
                      ...parentName.split('..'),
                      value,
                    ];

                    const checkboxValue = get(modifiedData, checkboxName, false);

                    if (!subChildrenForm) {
                      return (
                        <CheckboxWithCondition
                          key={label}
                          disabled={isFormDisabled || IS_DISABLED}
                          name={checkboxName.join('..')}
                          onChange={onChangeSimpleCheckbox}
                          value={checkboxValue}
                        />
                      );
                    }

                    const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(
                      checkboxValue
                    );

                    return (
                      <CheckboxWithCondition
                        key={label}
                        disabled={isFormDisabled || IS_DISABLED}
                        name={checkboxName.join('..')}
                        onChange={onChangeParentCheckbox}
                        value={hasAllActionsSelected}
                        someChecked={hasSomeActionsSelected}
                      />
                    );
                  })}
                </Flex>
              </Flex>
            </RowWrapper>
            {displayedRecursiveChildren && isActive && (
              <SubLevelWrapper>
                <SubActionRow
                  isFormDisabled={isFormDisabled}
                  parentName={`${parentName}..${value}`}
                  pathToDataFromActionRow={pathToDataFromActionRow}
                  propertyActions={propertyActions}
                  propertyName={propertyName}
                  recursiveLevel={recursiveLevel + 1}
                  childrenForm={displayedRecursiveChildren.children}
                />
              </SubLevelWrapper>
            )}
          </LeftBorderTimeline>
        );
      })}
    </Wrapper>
  );
};

SubActionRow.propTypes = {
  childrenForm: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  parentName: PropTypes.string.isRequired,
  pathToDataFromActionRow: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  propertyName: PropTypes.string.isRequired,
  recursiveLevel: PropTypes.number.isRequired,
};

export default memo(SubActionRow);
