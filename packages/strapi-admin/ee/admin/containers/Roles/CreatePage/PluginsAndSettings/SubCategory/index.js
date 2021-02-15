import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
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

const SubCategory = ({ categoryName, actions }) => {
  const { formatMessage } = useIntl();

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
              // name={`select-all-${categoryName}`}
              name="todo"
              message={formatMessage({ id: 'app.utils.select-all' })}
              disabled
              onChange={() => {}}
              someChecked={false}
              value={false}
            />
          </Padded>
        </Flex>
        <BaselineAlignment top size="1px" />
        <Padded top size="xs">
          <Flex flexWrap="wrap">
            {actions.map(sc => (
              <CheckboxWrapper disabled hasConditions={false} key={sc.action}>
                <Checkbox
                  value={false}
                  name="todo"
                  // TODO
                  disabled={false}
                  message={sc.displayName}
                  onChange={() => {}}
                />
              </CheckboxWrapper>
            ))}
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
  categoryName: PropTypes.string.isRequired,
  actions: PropTypes.array.isRequired,
};

export default SubCategory;
