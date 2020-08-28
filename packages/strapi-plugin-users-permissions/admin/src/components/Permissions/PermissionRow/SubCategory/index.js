import React, { useCallback, useMemo } from 'react';
import { get } from 'lodash';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useIntl } from 'react-intl';
import CheckboxWrapper from '../CheckboxWrapper';
import BaselineAlignment from '../BaselineAlignment';
import SubCategoryWrapper from './SubCategoryWrapper';
import { useUsersPermissions } from '../../../../contexts/UsersPermissionsContext';
import PolicyWrapper from './PolicyWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ subCategory }) => {
  const { formatMessage } = useIntl();
  const {
    onChange,
    onChangeSelectAll,
    onSelectedAction,
    selectedAction,
    modifiedData,
  } = useUsersPermissions();

  const currentScopedModifiedData = useMemo(() => {
    return get(modifiedData, subCategory.name, {});
  }, [modifiedData, subCategory]);

  const hasAllActionsSelected = useMemo(() => {
    return Object.values(currentScopedModifiedData).every(action => action.enabled === true);
  }, [currentScopedModifiedData]);

  const hasSomeActionsSelected = useMemo(() => {
    return (
      Object.values(currentScopedModifiedData).some(action => action.enabled === true) &&
      !hasAllActionsSelected
    );
  }, [currentScopedModifiedData, hasAllActionsSelected]);

  const handleChangeSelectAll = useCallback(
    ({ target: { name } }) => {
      onChangeSelectAll({ target: { name, value: !hasAllActionsSelected } });
    },
    [hasAllActionsSelected, onChangeSelectAll]
  );

  const isActionSelected = useCallback(
    actionName => {
      return selectedAction === actionName;
    },
    [selectedAction]
  );

  return (
    <SubCategoryWrapper>
      <Flex justifyContent="space-between" alignItems="center">
        <Padded right size="sm">
          <Text
            lineHeight="18px"
            color="#919bae"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
          >
            {subCategory.label}
          </Text>
        </Padded>
        <Border />
        <Padded left size="sm">
          <BaselineAlignment />
          <Checkbox
            name={subCategory.name}
            message={formatMessage({ id: 'app.utils.select-all' })}
            onChange={handleChangeSelectAll}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
          />
        </Padded>
      </Flex>
      <BaselineAlignment />
      <Padded top size="xs">
        <Flex flexWrap="wrap">
          {subCategory.actions.map(action => {
            const name = `${action.name}.enabled`;

            return (
              <CheckboxWrapper isActive={isActionSelected(action.name)} key={action.name}>
                <Checkbox
                  value={get(modifiedData, name, false)}
                  name={name}
                  message={action.label}
                  onChange={onChange}
                />
                <PolicyWrapper onClick={() => onSelectedAction(action.name)}>
                  <FontAwesomeIcon icon="cog" />
                </PolicyWrapper>
              </CheckboxWrapper>
            );
          })}
        </Flex>
      </Padded>
    </SubCategoryWrapper>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;
