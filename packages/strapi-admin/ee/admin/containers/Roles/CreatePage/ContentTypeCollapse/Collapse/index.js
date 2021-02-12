import React, { useMemo } from 'react';
import { get, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import { Flex, Padded } from '@buffetjs/core';
import { usePermissionsDataManager } from '../../contexts/PermissionsDataManagerContext';
import CheckboxWithCondition from '../../CheckboxWithCondition';
import Chevron from '../../Chevron';
import ConditionsButton from '../../ConditionsButton';
import HiddenAction from '../../HiddenAction';
import Wrapper from './Wrapper';
import RowLabel from '../../RowLabel';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';

const Collapse = ({ availableActions, isActive, isGrey, label, onClickToggle, pathToData }) => {
  const {
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();

  // This corresponds to the data related to the CT left checkboxe
  // modifiedData: { collectionTypes: { [ctuid]: {create: {fields: {f1: true}, update: {}, ... } } } }
  const mainData = get(modifiedData, pathToData.split('..'), {});
  // The utils we are using: getCheckboxState, retrieves if all the boolean values of an object in order
  // to return the state of checkbox. Since the conditions are not related to the property we need to remove the key from the object.
  // TODO: scope the fields, locales in a properties key to simplify the code
  const dataWithoutCondition = useMemo(() => {
    return Object.keys(mainData).reduce((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current]);

      return acc;
    }, {});
  }, [mainData]);
  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

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
          {availableActions.map(({ actionId, isDisplayed, applyToProperties }) => {
            if (!isDisplayed) {
              return <HiddenAction key={actionId} />;
            }

            // TODO maybe this is not needed
            const baseCheckboxName = [...pathToData.split('..'), actionId];
            const checkboxName = isEmpty(applyToProperties)
              ? [...baseCheckboxName, 'enabled']
              : baseCheckboxName;

            if (isEmpty(applyToProperties)) {
              const value = get(modifiedData, checkboxName, false);

              return (
                <CheckboxWithCondition
                  key={actionId}
                  name={checkboxName.join('..')}
                  onChange={onChangeSimpleCheckbox}
                  value={value}
                />
              );
            }

            const mainData = get(modifiedData, checkboxName, null);

            const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(mainData);

            return (
              <CheckboxWithCondition
                key={actionId}
                name={checkboxName.join('..')}
                onChange={onChangeParentCheckbox}
                someChecked={hasSomeActionsSelected}
                value={hasAllActionsSelected}
              />
            );
          })}
        </Flex>
        <ConditionsButton isRight onClick={() => console.log('todo')} />
      </Flex>
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
