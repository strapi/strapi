import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts';
import generateHeadersFromActions from './utils/generateHeadersFromActions';
import Header from './Header';
import ActionRow from './ActionRow';

const Wrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary600};
  border-top: none;
  border-bottom: ${({ isLast, theme }) => {
    if (isLast) {
      return `1px solid ${theme.colors.primary600}`;
    }

    return `none`;
  }};
  border-radius: 0px 0px 2px 2px;
`;

Wrapper.defaultProps = {
  isLast: true,
};

const CollapsePropertyMatrix = ({
  availableActions,
  childrenForm,
  isLast,
  isFormDisabled,
  label,
  pathToData,
  propertyName,
}) => {
  const propertyActions = useMemo(
    () => generateHeadersFromActions(availableActions, propertyName),
    [availableActions, propertyName]
  );

  return (
    <Wrapper isLast={isLast}>
      <Header label={label} headers={propertyActions} />
      <Box>
        {childrenForm.map(({ children: childrenForm, label, value, required }, i) => (
          <ActionRow
            childrenForm={childrenForm}
            key={value}
            label={label}
            isFormDisabled={isFormDisabled}
            name={value}
            required={required}
            propertyActions={propertyActions}
            pathToData={pathToData}
            propertyName={propertyName}
            isOdd={i % 2 === 0}
          />
        ))}
      </Box>
    </Wrapper>
  );
};

CollapsePropertyMatrix.propTypes = {
  childrenForm: PropTypes.array.isRequired,
  availableActions: PropTypes.array.isRequired,
  isLast: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  pathToData: PropTypes.string.isRequired,
  propertyName: PropTypes.string.isRequired,
};

export default CollapsePropertyMatrix;
