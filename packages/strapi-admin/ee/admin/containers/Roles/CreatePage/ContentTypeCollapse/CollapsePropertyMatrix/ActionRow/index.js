import React, { memo, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Padded, Flex } from '@buffetjs/core';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import RowLabel from '../../../RowLabel';
import RecursiveMatrix from '../SubActionRow';
import Wrapper from './Wrapper';

const ActionRow = ({ name, value, required, propertyActions }) => {
  const [rowToOpen, setRowToOpen] = useState(null);

  const isActive = rowToOpen === name;

  const recursiveValues = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value;
  }, [value]);

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
            label={name}
            // TODO
            textColor="grey"
          >
            {required && <RequiredSign>*</RequiredSign>}
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
        <RecursiveMatrix name={name} propertyActions={propertyActions} values={recursiveValues} />
      )}
    </>
  );
};

ActionRow.defaultProps = {
  required: false,
};

ActionRow.propTypes = {
  name: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  required: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
};

export default memo(ActionRow);
