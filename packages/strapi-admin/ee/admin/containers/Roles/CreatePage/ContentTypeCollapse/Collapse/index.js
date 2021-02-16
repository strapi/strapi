import React, { useMemo, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Flex, Padded } from '@buffetjs/core';
import { usePermissionsDataManager } from '../../contexts/PermissionsDataManagerContext';
import CheckboxWithCondition from '../../CheckboxWithCondition';
import Chevron from '../../Chevron';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import HiddenAction from '../../HiddenAction';
import RowLabel from '../../RowLabel';
import Wrapper from './Wrapper';
import generateCheckboxesActions from './utils/generateCheckboxesActions';

const Collapse = ({ availableActions, isActive, isGrey, label, onClickToggle, pathToData }) => {
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

  // This corresponds to the data related to the CT left checkboxe
  // modifiedData: { collectionTypes: { [ctuid]: {create: {fields: {f1: true}, update: {}, ... } } } }
  const mainData = get(modifiedData, pathToData.split('..'), {});
  // The utils we are using: getCheckboxState, retrieves if all the boolean values of an object in order
  // to return the state of checkbox. Since the conditions are not related to the property we need to remove the key from the object.
  const dataWithoutCondition = useMemo(() => {
    return Object.keys(mainData).reduce((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current]);

      return acc;
    }, {});
  }, [mainData]);
  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  const checkboxesActions = useMemo(() => {
    return generateCheckboxesActions(availableActions, modifiedData, pathToData);
  }, [availableActions, modifiedData, pathToData]);

  return (
    <Wrapper isActive={isActive} isGrey={isGrey}>
      <Flex style={{ flex: 1 }}>
        <Padded left size="sm" />
        <RowLabel
          isCollapsable
          label={label}
          checkboxName={pathToData}
          onChange={onChangeParentCheckbox}
          onClick={onClickToggle}
          someChecked={hasSomeActionsSelected}
          value={hasAllActionsSelected}
        >
          <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
        </RowLabel>

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
                  hasConditions={hasConditions}
                  name={checkboxName}
                  onChange={onChangeSimpleCheckbox}
                  value={hasAllActionsSelected}
                />
              );
            }
          )}
        </Flex>
        <ConditionsButton isRight onClick={handleToggleModalIsOpen} />
      </Flex>
      {modalState.isMounted && (
        <ConditionsModal
          headerBreadCrumbs={[label, 'app.components.LeftMenuLinkContainer.settings']}
          actions={checkboxesActions}
          isOpen={modalState.isOpen}
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
  label: PropTypes.string.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  pathToData: PropTypes.string.isRequired,
};

export default Collapse;
