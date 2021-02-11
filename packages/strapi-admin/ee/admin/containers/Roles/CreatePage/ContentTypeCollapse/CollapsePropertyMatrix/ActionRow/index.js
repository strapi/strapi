import React, { memo, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Padded, Flex } from '@buffetjs/core';
import { usePermissionsDataManager } from '../../../contexts/PermissionsDataManagerContext';
import { getCheckboxState } from '../../../utils';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import RowLabel from '../../../RowLabel';
import SubActionRow from '../SubActionRow';
import Wrapper from './Wrapper';
import getRowLabelCheckboxeState from './utils/getRowLabelCheckboxeState';

const ActionRow = ({
  childrenForm,
  label,
  name,
  required,
  pathToData,
  propertyActions,
  propertyName,
}) => {
  const [rowToOpen, setRowToOpen] = useState(null);
  const { modifiedData, onChangeSimpleCheckbox } = usePermissionsDataManager();

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

  const { hasAllActionsSelected, hasSomeActionsSelected } = useMemo(() => {
    return getRowLabelCheckboxeState(propertyActions, modifiedData, pathToData, propertyName, name);
  }, [propertyActions, modifiedData, pathToData, propertyName, name]);

  return (
    <>
      <Wrapper alignItems="center" isCollapsable={isCollapsable} isActive={isActive}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <RowLabel
            width="15rem"
            onClick={handleClick}
            isCollapsable={isCollapsable}
            label={label}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
          >
            {required && <RequiredSign />}
            <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
          </RowLabel>
          <Flex style={{ flex: 1 }}>
            {propertyActions.map(({ label, isActionRelatedToCurrentProperty, actionId }) => {
              if (!isActionRelatedToCurrentProperty) {
                return <HiddenAction key={label} />;
              }

              const checkboxName = [...pathToData.split('..'), actionId, propertyName, name];

              if (!isCollapsable) {
                const checkboxValue = get(modifiedData, checkboxName, false);

                return (
                  <CheckboxWithCondition
                    key={actionId}
                    name={checkboxName.join('..')}
                    onChange={onChangeSimpleCheckbox}
                    value={checkboxValue}
                  />
                );
              }

              const data = get(modifiedData, checkboxName, {});

              const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(data);

              return (
                <CheckboxWithCondition
                  key={label}
                  name="todo"
                  value={hasAllActionsSelected}
                  someChecked={hasSomeActionsSelected}
                />
              );
            })}
          </Flex>
        </Flex>
      </Wrapper>
      {isActive && (
        <SubActionRow
          childrenForm={recursiveValues}
          parentName={name}
          pathToDataFromActionRow={pathToData}
          propertyName={propertyName}
          propertyActions={propertyActions}
          recursiveLevel={0}
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
  pathToData: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  propertyName: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

export default memo(ActionRow);
