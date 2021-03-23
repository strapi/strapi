import React, { useMemo, useState } from 'react';
import { get, omit } from 'lodash';
import PropTypes from 'prop-types';
import { Flex, Padded } from '@buffetjs/core';
import IS_DISABLED from 'ee_else_ce/components/Roles/ContentTypeCollapse/Collapse/utils/constants';
import { usePermissionsDataManager } from '../../../../hooks';
import { getCheckboxState } from '../../utils';
import CheckboxWithCondition from '../../CheckboxWithCondition';
import Chevron from '../../Chevron';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import HiddenAction from '../../HiddenAction';
import RowLabelWithCheckbox from '../../RowLabelWithCheckbox';
import Wrapper from './Wrapper';
import generateCheckboxesActions from './utils/generateCheckboxesActions';

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
      <Flex style={{ flex: 1 }}>
        <Padded left size="sm" />
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
          <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
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
            }) => {
              if (!isDisplayed) {
                return <HiddenAction key={actionId} />;
              }

              if (isParentCheckbox) {
                return (
                  <CheckboxWithCondition
                    key={actionId}
                    disabled={isFormDisabled || IS_DISABLED}
                    hasConditions={hasConditions}
                    name={checkboxName}
                    onChange={onChangeParentCheckbox}
                    someChecked={hasSomeActionsSelected}
                    value={hasAllActionsSelected}
                  />
                );
              }

              return (
                <CheckboxWithCondition
                  key={actionId}
                  disabled={isFormDisabled || IS_DISABLED}
                  hasConditions={hasConditions}
                  name={checkboxName}
                  onChange={onChangeSimpleCheckbox}
                  value={hasAllActionsSelected}
                />
              );
            }
          )}
        </Flex>
        <ConditionsButton
          isRight
          onClick={handleToggleModalIsOpen}
          hasConditions={doesConditionButtonHasConditions}
        />
      </Flex>
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
