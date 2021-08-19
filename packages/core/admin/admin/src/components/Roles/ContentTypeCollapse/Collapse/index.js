import { Box, Checkbox, Text, Row } from '@strapi/parts';
import { Up, Down } from '@strapi/icons';
import IS_DISABLED from 'ee_else_ce/components/Roles/ContentTypeCollapse/Collapse/utils/constants';
import { get, omit } from 'lodash';
import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { usePermissionsDataManager } from '../../../../hooks';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import HiddenAction from '../../HiddenAction';
import { cellWidth } from '../../Permissions/utils/constants';
import RowLabelWithCheckbox from '../../RowLabelWithCheckbox';
import { getCheckboxState } from '../../utils';
import generateCheckboxesActions from './utils/generateCheckboxesActions';

const activeRowStyle = (theme, isActive, isClicked) => `
  ${isClicked ? `border: 1px solid ${theme.colors.primary600}; border-bottom: none;` : ''}
  background-color: ${theme.colors.primary100};
  color: ${theme.colors.primary600};
  border-radius: ${isActive ? '2px 2px 0 0' : '2px'};
  ${Text} {
    color: ${theme.colors.primary600};
    font-weight: bold;
  }
  ${Chevron} {
    display: block;
  }
  ${ConditionsButton} {
    display: block;
  }
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  height: 52px;
  background-color: ${({ isGrey, theme }) =>
    isGrey ? theme.colors.neutral100 : theme.colors.neutral0};
  border: 1px solid transparent;
  ${ConditionsButton} {
    display: none;
  }
  ${({ isActive, theme }) => isActive && activeRowStyle(theme, isActive, true)}
  &:hover {
    ${({ theme, isActive }) => activeRowStyle(theme, isActive)}
  }
`;

const Cell = styled(Row)`
  width: ${cellWidth};
  position: relative;
`;

const Chevron = styled(Box)`
  display: none;
  svg {
    width: 11px;
  }
  * {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const TinyDot = styled(Box)`
  position: absolute;
  top: 0;
  left: 35px;
  width: 6px;
  height: 6px;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.primary600};
`;

const Collapse = ({
  availableActions,
  isActive,
  isGrey,
  isFormDisabled,
  label,
  onClickToggle,
  pathToData,
}) => {
  const [modalState, setModalState] = useState({ isOpen: false, isMounted: false });
  const {
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();

  const handleToggleModalIsOpen = () => {
    setModalState(prevState => ({ isMounted: true, isOpen: !prevState.isOpen }));
  };

  const handleModalClose = () => {
    setModalState(prevState => ({ ...prevState, isMounted: false }));
  };

  // This corresponds to the data related to the CT left checkbox
  // modifiedData: { collectionTypes: { [ctuid]: {create: {properties: { fields: {f1: true} }, update: {}, ... } } } }
  const mainData = get(modifiedData, pathToData.split('..'), {});
  // The utils we are using: getCheckboxState, retrieves all the boolean leafs of an object in order
  // to return the state of checkbox. Since the conditions are not related to the property we need to remove the key from the object.
  const dataWithoutCondition = useMemo(() => {
    return Object.keys(mainData).reduce((acc, current) => {
      acc[current] = omit(mainData[current], 'conditions');

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  // Here we create an array of <checkbox>, since the state of each one of them is used in
  // order to know if whether or not we need to display the associated action in
  // the <ConditionsModal />
  const checkboxesActions = useMemo(() => {
    return generateCheckboxesActions(availableActions, modifiedData, pathToData);
  }, [availableActions, modifiedData, pathToData]);

  const doesConditionButtonHasConditions = checkboxesActions.some(
    ({ hasConditions }) => hasConditions
  );

  return (
    <Wrapper isActive={isActive} isGrey={isGrey}>
      <RowLabelWithCheckbox
        isCollapsable
        isFormDisabled={isFormDisabled}
        label={label}
        checkboxName={pathToData}
        onChange={onChangeParentCheckbox}
        onClick={onClickToggle}
        someChecked={hasSomeActionsSelected}
        value={hasAllActionsSelected}
      >
        <Chevron paddingLeft={2}>{isActive ? <Up /> : <Down />}</Chevron>
      </RowLabelWithCheckbox>

      <Row>
        {checkboxesActions.map(
          ({
            actionId,
            hasConditions,
            hasAllActionsSelected,
            hasSomeActionsSelected,
            isDisplayed,
            isParentCheckbox,
            checkboxName,
          }) => {
            if (!isDisplayed) {
              return <HiddenAction key={actionId} />;
            }

            if (isParentCheckbox) {
              return (
                <Cell key={actionId} justifyContent="center" alignItems="center">
                  {hasConditions && <TinyDot />}
                  <Checkbox
                    disabled={isFormDisabled || IS_DISABLED}
                    name={checkboxName}
                    // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                    onValueChange={value =>
                      onChangeParentCheckbox({
                        target: {
                          name: checkboxName,
                          value,
                        },
                      })}
                    indeterminate={hasSomeActionsSelected}
                    value={hasAllActionsSelected}
                  />
                </Cell>
              );
            }

            return (
              <Cell key={actionId} justifyContent="center" alignItems="center">
                {hasConditions && <TinyDot />}
                <Checkbox
                  disabled={isFormDisabled || IS_DISABLED}
                  indeterminate={hasConditions}
                  name={checkboxName}
                  // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                  onValueChange={value =>
                    onChangeSimpleCheckbox({
                      target: {
                        name: checkboxName,
                        value,
                      },
                    })}
                  value={hasAllActionsSelected}
                />
              </Cell>
            );
          }
        )}
      </Row>
      <ConditionsButton
        onClick={handleToggleModalIsOpen}
        hasConditions={doesConditionButtonHasConditions}
      />
      {modalState.isMounted && (
        <ConditionsModal
          headerBreadCrumbs={[label, 'app.components.LeftMenuLinkContainer.settings']}
          actions={checkboxesActions}
          isOpen={modalState.isOpen}
          isFormDisabled={isFormDisabled}
          onClosed={handleModalClose}
          onToggle={handleToggleModalIsOpen}
        />
      )}
    </Wrapper>
  );
};

Collapse.propTypes = {
  availableActions: PropTypes.array.isRequired,
  isActive: PropTypes.bool.isRequired,
  isGrey: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  pathToData: PropTypes.string.isRequired,
};

export default Collapse;
