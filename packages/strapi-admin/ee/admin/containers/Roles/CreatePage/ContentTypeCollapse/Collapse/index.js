import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded } from '@buffetjs/core';
import CheckboxWithCondition from '../../CheckboxWithCondition';
import Chevron from '../../Chevron';
import ConditionsButton from '../../ConditionsButton';
import HiddenAction from '../../HiddenAction';
import Wrapper from './Wrapper';
import RowLabel from '../../RowLabel';

const Collapse = ({ availableActions, isActive, isGrey, name, onClickToggle }) => {
  return (
    <Wrapper isActive={isActive} isGrey={isGrey}>
      <Flex style={{ flex: 1 }}>
        <Padded left size="sm" />
        <RowLabel label={name} onClick={onClickToggle} isCollapsable>
          <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
        </RowLabel>

        <Flex style={{ flex: 1 }}>
          {availableActions.map(action => {
            if (!action.isDisplayed) {
              return <HiddenAction key={action.actionId} />;
            }

            return <CheckboxWithCondition key={action.actionId} name={action.actionId} />;
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
};

export default Collapse;
