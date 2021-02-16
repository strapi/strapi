import React, { useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { usePermissionsDataManager } from '../../contexts/PermissionsDataManagerContext';
import { getCheckboxState, removeConditionKeyFromData } from '../../utils';
import ConditionsButton from '../../ConditionsButton';
import CheckboxWrapper from './CheckboxWrapper';
import Wrapper from './Wrapper';
import ConditionsButtonWrapper from './ConditionsButtonWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ categoryName, actions, pathToData }) => {
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
              {categoryName}
            </Text>
          </Padded>
          <Border />
          <Padded left size="sm">
            <BaselineAlignment top size="1px" />
            <Checkbox
              name={pathToData.join('..')}
              message={formatMessage({ id: 'app.utils.select-all' })}
              // TODO
              disabled={false}
              onChange={onChangeParentCheckbox}
              someChecked={hasSomeActionsSelected}
              value={hasAllActionsSelected}
            />
          </Padded>
        </Flex>
        <BaselineAlignment top size="1px" />
        <Padded top size="xs">
          <Flex flexWrap="wrap">
            {actions.map(sc => {
              const checkboxName = [...pathToData, sc.action, 'enabled'];
              const value = get(modifiedData, checkboxName, false);

              return (
                <CheckboxWrapper disabled hasConditions={false} key={sc.action}>
                  <Checkbox
                    name={checkboxName.join('..')}
                    // TODO
                    disabled={false}
                    message={sc.displayName}
                    onChange={onChangeSimpleCheckbox}
                    value={value}
                  />
                </CheckboxWrapper>
              );
            })}
          </Flex>
          <ConditionsButtonWrapper disabled={false} hasConditions={false}>
            <ConditionsButton hasConditions={false} onClick={() => {}} />
          </ConditionsButtonWrapper>
        </Padded>
      </Wrapper>
    </>
  );
};

SubCategory.propTypes = {
  actions: PropTypes.array.isRequired,
  categoryName: PropTypes.string.isRequired,
  pathToData: PropTypes.array.isRequired,
};

export default SubCategory;
