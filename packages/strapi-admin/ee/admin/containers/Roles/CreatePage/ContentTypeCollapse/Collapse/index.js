import React, { useMemo } from 'react';
import { get } from 'lodash';
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

const Collapse = ({ availableActions, isActive, isGrey, name, onClickToggle, pathToData }) => {
  const { modifiedData } = usePermissionsDataManager();

  // This corresponds to the data related to the CT left checkboxe
  // modifiedData: { collectionTypes: { [ctuid]: {create: {fields: {f1: true} } } } }
  const mainData = get(modifiedData, pathToData.split('..'), {});
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
          label={name}
          onClick={onClickToggle}
          isCollapsable
          someChecked={hasSomeActionsSelected}
          value={hasAllActionsSelected}
        >
          <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
        </RowLabel>

        <Flex style={{ flex: 1 }}>
          {availableActions.map(({ actionId, isDisplayed }) => {
            if (!isDisplayed) {
              return <HiddenAction key={actionId} />;
            }

            const checkboxName = [...pathToData.split('..'), actionId];
            const mainData = get(modifiedData, checkboxName, null);

            const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(mainData);

            return (
              <CheckboxWithCondition
                key={actionId}
                name={checkboxName.join('..')}
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
  name: PropTypes.string.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  pathToData: PropTypes.string.isRequired,
};

export default Collapse;
