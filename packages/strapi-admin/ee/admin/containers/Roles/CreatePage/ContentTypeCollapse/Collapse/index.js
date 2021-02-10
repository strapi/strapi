import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';
import CheckboxWithCondition from '../../CheckboxWithCondition';
import CollapseLabel from '../../CollapseLabel';
import ActionsWrapper from './ActionsWrapper';
import Chevron from './Chevron';
import HiddenAction from './HiddenAction';
import NameWrapper from './NameWrapper';
import Wrapper from './Wrapper';
import ConditionsButton from '../../ConditionsButton';

const Collapse = ({ availableActions, isActive, isGrey, name, onClickToggle }) => {
  return (
    <Wrapper isActive={isActive} isGrey={isGrey}>
      <Flex style={{ flex: 1 }}>
        <Padded left size="sm" />
        <NameWrapper>
          <Checkbox name="todo" value={false} />
          <CollapseLabel title={name} alignItems="center" isCollapsable onClick={onClickToggle}>
            <Text
              color="grey"
              ellipsis
              fontSize="xs"
              fontWeight="bold"
              lineHeight="20px"
              textTransform="uppercase"
            >
              {name}
            </Text>
            <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
          </CollapseLabel>
        </NameWrapper>
        <ActionsWrapper>
          {availableActions.map(action => {
            if (!action.isDisplayed) {
              return <HiddenAction key={action.actionId} />;
            }

            return <CheckboxWithCondition key={action.actionId} name={action.actionId} />;
          })}
        </ActionsWrapper>
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
