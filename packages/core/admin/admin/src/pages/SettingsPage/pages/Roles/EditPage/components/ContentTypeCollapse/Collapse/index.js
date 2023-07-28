import React, { useMemo, useState } from 'react';

import { BaseCheckbox, Box, Flex } from '@strapi/design-system';
import { ChevronDown, ChevronUp } from '@strapi/icons';
import get from 'lodash/get';
import omit from 'lodash/omit';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { usePermissionsDataManager } from '../../../../../../../../hooks';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import HiddenAction from '../../HiddenAction';
import { cellWidth, rowHeight } from '../../Permissions/utils/constants';
import RowLabelWithCheckbox from '../../RowLabelWithCheckbox';
import { getCheckboxState } from '../../utils';
import activeStyle from '../utils/activeStyle';

import generateCheckboxesActions from './utils/generateCheckboxesActions';

const activeRowStyle = (theme, isActive) => `
  ${Wrapper} {
    background-color: ${theme.colors.primary100};
    color: ${theme.colors.primary600};
    border-radius: ${isActive ? '2px 2px 0 0' : '2px'};
  }
  ${Chevron} {
    display: flex;
  }
  ${ConditionsButton} {
    display: block;
  }
  &:hover {
   ${activeStyle(theme)}
  }

  &:focus-within {
    ${({ theme, isActive }) => activeRowStyle(theme, isActive)}
  }
  
`;

const Wrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  height: ${rowHeight};
  background-color: ${({ isGrey, theme }) =>
    isGrey ? theme.colors.neutral100 : theme.colors.neutral0};
  border: 1px solid transparent;
`;

const BoxWrapper = styled.div`
  display: inline-flex;
  min-width: 100%;

  ${ConditionsButton} {
    display: none;
  }
  ${({ isActive, theme }) => isActive && activeRowStyle(theme, isActive)}
  &:hover {
    ${({ theme, isActive }) => activeRowStyle(theme, isActive)}
  }
`;

const Cell = styled(Flex)`
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

const TinyDot = styled.span`
  position: absolute;
  top: -6px;
  left: 37px;
  width: 6px;
  height: 6px;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.primary600};
`;

const AbsoluteBox = styled(Box)`
  position: absolute;
  right: 9px;
  transform: translateY(10px);
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
  const [isModalOpen, setModalOpen] = useState(false);
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();

  const handleToggleModalIsOpen = () => {
    setModalOpen((s) => !s);
  };

  const handleModalClose = () => {
    setModalOpen(false);
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
    <BoxWrapper isActive={isActive}>
      <Wrapper isGrey={isGrey}>
        <RowLabelWithCheckbox
          isCollapsable
          isFormDisabled={isFormDisabled}
          label={label}
          checkboxName={pathToData}
          onChange={onChangeParentCheckbox}
          onClick={onClickToggle}
          someChecked={hasSomeActionsSelected}
          value={hasAllActionsSelected}
          isActive={isActive}
        >
          <Chevron paddingLeft={2}>{isActive ? <ChevronUp /> : <ChevronDown />}</Chevron>
        </RowLabelWithCheckbox>

        <Flex style={{ flex: 1 }}>
          {checkboxesActions.map(
            ({
              actionId,
              hasConditions,
              hasAllActionsSelected,
              hasSomeActionsSelected,
              isDisplayed,
              isParentCheckbox,
              checkboxName,
              label: permissionLabel,
            }) => {
              if (!isDisplayed) {
                return <HiddenAction key={actionId} />;
              }

              if (isParentCheckbox) {
                return (
                  <Cell key={actionId} justifyContent="center" alignItems="center">
                    {hasConditions && <TinyDot />}
                    <BaseCheckbox
                      disabled={isFormDisabled}
                      name={checkboxName}
                      aria-label={formatMessage(
                        {
                          id: `Settings.permissions.select-by-permission`,
                          defaultMessage: 'Select {label} permission',
                        },
                        { label: `${permissionLabel} ${label}` }
                      )}
                      // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                      onValueChange={(value) => {
                        onChangeParentCheckbox({
                          target: {
                            name: checkboxName,
                            value,
                          },
                        });
                      }}
                      indeterminate={hasSomeActionsSelected}
                      value={hasAllActionsSelected}
                    />
                  </Cell>
                );
              }

              return (
                <Cell key={actionId} justifyContent="center" alignItems="center">
                  {hasConditions && <TinyDot />}
                  <BaseCheckbox
                    disabled={isFormDisabled}
                    indeterminate={hasConditions}
                    name={checkboxName}
                    // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                    onValueChange={(value) => {
                      onChangeSimpleCheckbox({
                        target: {
                          name: checkboxName,
                          value,
                        },
                      });
                    }}
                    value={hasAllActionsSelected}
                  />
                </Cell>
              );
            }
          )}
        </Flex>
        {isModalOpen && (
          <ConditionsModal
            headerBreadCrumbs={[label, 'Settings.permissions.conditions.conditions']}
            actions={checkboxesActions}
            isFormDisabled={isFormDisabled}
            onClosed={handleModalClose}
            onToggle={handleToggleModalIsOpen}
          />
        )}
      </Wrapper>
      <AbsoluteBox>
        <ConditionsButton
          onClick={handleToggleModalIsOpen}
          hasConditions={doesConditionButtonHasConditions}
        />
      </AbsoluteBox>
    </BoxWrapper>
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
