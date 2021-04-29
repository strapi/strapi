import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { get } from 'lodash';
import IS_DISABLED from 'ee_else_ce/components/Roles/PluginsAndSettings/SubCategory/utils/constants';
import { usePermissionsDataManager } from '../../../../hooks';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';
import ConditionsButton from '../../ConditionsButton';
import ConditionsModal from '../../ConditionsModal';
import CheckboxWrapper from './CheckboxWrapper';
import ConditionsButtonWrapper from './ConditionsButtonWrapper';
import Wrapper from './Wrapper';
import { formatActions, getConditionsButtonState } from './utils';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ categoryName, isFormDisabled, subCategoryName, actions, pathToData }) => {
  const [modalState, setModalState] = useState({ isOpen: false, isMounted: false });
  const {
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();
  const { formatMessage } = useIntl();

  const mainData = get(modifiedData, pathToData, {});
  const dataWithoutCondition = useMemo(() => {
    return Object.keys(mainData).reduce((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current]);

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  const handleToggleModalIsOpen = () => {
    setModalState(prevState => ({ isMounted: true, isOpen: !prevState.isOpen }));
  };

  const handleModalClose = () => {
    setModalState(prevState => ({ ...prevState, isMounted: false }));
  };

  // We need to format the actions so it matches the shape of the ConditionsModal actions props
  const formattedActions = formatActions(actions, modifiedData, pathToData);
  const doesButtonHasCondition = getConditionsButtonState(get(modifiedData, [...pathToData], {}));

  return (
    <>
      <Wrapper>
        <Flex justifyContent="space-between" alignItems="center">
          <Padded right size="sm">
            <Text
              lineHeight="18px"
              color="#919bae"
              fontWeight="bold"
              fontSize="xs"
              textTransform="uppercase"
            >
              {subCategoryName}
            </Text>
          </Padded>
          <Border />
          <Padded left size="sm">
            <BaselineAlignment top size="1px" />
            <Checkbox
              name={pathToData.join('..')}
              message={formatMessage({ id: 'app.utils.select-all' })}
              disabled={isFormDisabled || IS_DISABLED}
              onChange={onChangeParentCheckbox}
              someChecked={hasSomeActionsSelected}
              value={hasAllActionsSelected}
            />
          </Padded>
        </Flex>
        <BaselineAlignment top size="1px" />
        <Padded top size="xs">
          <Flex flexWrap="wrap">
            {formattedActions.map(({ checkboxName, value, action, displayName, hasConditions }) => {
              return (
                <CheckboxWrapper
                  disabled={isFormDisabled || IS_DISABLED}
                  hasConditions={hasConditions}
                  key={action}
                >
                  <Checkbox
                    name={checkboxName}
                    disabled={isFormDisabled || IS_DISABLED}
                    message={displayName}
                    onChange={onChangeSimpleCheckbox}
                    value={value}
                  />
                </CheckboxWrapper>
              );
            })}
          </Flex>
          <ConditionsButtonWrapper disabled={isFormDisabled} hasConditions={doesButtonHasCondition}>
            <ConditionsButton
              hasConditions={doesButtonHasCondition}
              onClick={handleToggleModalIsOpen}
            />
          </ConditionsButtonWrapper>
        </Padded>
      </Wrapper>
      {modalState.isMounted && (
        <ConditionsModal
          headerBreadCrumbs={[categoryName, subCategoryName]}
          actions={formattedActions}
          isOpen={modalState.isOpen}
          isFormDisabled={isFormDisabled}
          onClosed={handleModalClose}
          onToggle={handleToggleModalIsOpen}
        />
      )}
    </>
  );
};

SubCategory.propTypes = {
  actions: PropTypes.array.isRequired,
  categoryName: PropTypes.string.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  subCategoryName: PropTypes.string.isRequired,
  pathToData: PropTypes.array.isRequired,
};

export default SubCategory;
