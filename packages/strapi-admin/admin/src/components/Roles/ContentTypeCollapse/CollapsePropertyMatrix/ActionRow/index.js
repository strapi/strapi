import React, { memo, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Padded, Flex } from '@buffetjs/core';
import IS_DISABLED from 'ee_else_ce/components/Roles/ContentTypeCollapse/CollapsePropertyMatrix/ActionRow/utils/constants';
import { usePermissionsDataManager } from '../../../../../hooks';
import { getCheckboxState } from '../../../utils';
import CheckboxWithCondition from '../../../CheckboxWithCondition';
import Chevron from '../../../Chevron';
import HiddenAction from '../../../HiddenAction';
import RequiredSign from '../../../RequiredSign';
import RowLabelWithCheckbox from '../../../RowLabelWithCheckbox';
import SubActionRow from '../SubActionRow';
import Wrapper from './Wrapper';
import getRowLabelCheckboxeState from './utils/getRowLabelCheckboxeState';

const ActionRow = ({
  childrenForm,
  label,
  isFormDisabled,
  name,
  required,
  pathToData,
  propertyActions,
  propertyName,
}) => {
  const [rowToOpen, setRowToOpen] = useState(null);
  const {
    modifiedData,
    onChangeCollectionTypeLeftActionRowCheckbox,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();

  const isActive = rowToOpen === name;

  const recursiveChildren = useMemo(() => {
    if (!Array.isArray(childrenForm)) {
      return [];
    }

    return childrenForm;
  }, [childrenForm]);

  const isCollapsable = recursiveChildren.length > 0;

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

  const handleChangeLeftRowCheckbox = ({ target: { value } }) => {
    onChangeCollectionTypeLeftActionRowCheckbox(pathToData, propertyName, name, value);
  };

  const { hasAllActionsSelected, hasSomeActionsSelected } = useMemo(() => {
    return getRowLabelCheckboxeState(propertyActions, modifiedData, pathToData, propertyName, name);
  }, [propertyActions, modifiedData, pathToData, propertyName, name]);

  return (
    <>
      <Wrapper alignItems="center" isCollapsable={isCollapsable} isActive={isActive}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <RowLabelWithCheckbox
            width="15rem"
            onChange={handleChangeLeftRowCheckbox}
            onClick={handleClick}
            isCollapsable={isCollapsable}
            isFormDisabled={isFormDisabled}
            label={label}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
          >
            {required && <RequiredSign />}
            <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
          </RowLabelWithCheckbox>
          <Flex style={{ flex: 1 }}>
            {propertyActions.map(({ label, isActionRelatedToCurrentProperty, actionId }) => {
              if (!isActionRelatedToCurrentProperty) {
                return <HiddenAction key={label} />;
              }

              const checkboxName = [
                ...pathToData.split('..'),
                actionId,
                'properties',
                propertyName,
                name,
              ];

              if (!isCollapsable) {
                const checkboxValue = get(modifiedData, checkboxName, false);

                return (
                  <CheckboxWithCondition
                    key={actionId}
                    disabled={isFormDisabled || IS_DISABLED}
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
                  disabled={isFormDisabled || IS_DISABLED}
                  name={checkboxName.join('..')}
                  onChange={onChangeParentCheckbox}
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
          childrenForm={recursiveChildren}
          isFormDisabled={isFormDisabled}
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
  isFormDisabled: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  pathToData: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  propertyName: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

export default memo(ActionRow);
