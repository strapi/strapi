import React, { memo, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Padded, Flex } from '@buffetjs/core';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import RowLabel from '../../../RowLabel';
import SubActionRow from '../SubActionRow';
import Wrapper from './Wrapper';

const ActionRow = ({ childrenForm, label, name, required, propertyActions }) => {
  const [rowToOpen, setRowToOpen] = useState(null);

  const isActive = rowToOpen === name;

  const recursiveValues = useMemo(() => {
    if (!Array.isArray(childrenForm)) {
      return [];
    }

    return childrenForm;
  }, [childrenForm]);

  const isCollapsable = recursiveValues.length > 0;

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      setRowToOpen(prev => {
        if (prev === name) {
          return null;
        }

        return name;
      });
    }
  }, [isCollapsable, name]);

  return (
    <>
      <Wrapper alignItems="center" isCollapsable={isCollapsable}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <RowLabel
            width="15rem"
            onClick={handleClick}
            isCollapsable={isCollapsable}
            label={label}
            // TODO
            textColor="grey"
          >
            {required && <RequiredSign />}
            <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
          </RowLabel>
          <Flex style={{ flex: 1 }}>
            {propertyActions.map(action => {
              if (!action.isActionRelatedToCurrentProperty) {
                return <HiddenAction key={action.label} />;
              }

              return <CheckboxWithCondition key={action.label} name="todo" />;
            })}
          </Flex>
        </Flex>
      </Wrapper>
      {isActive && (
        <SubActionRow
          // label={label}
          // name={name}
          propertyActions={propertyActions}
          childrenForm={recursiveValues}
        />
      )}
    </>
  );
};

ActionRow.defaultProps = {
  childrenForm: [],
  required: false,
};

ActionRow.propTypes = {
  childrenForm: PropTypes.array,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  required: PropTypes.bool,
};

export default memo(ActionRow);
