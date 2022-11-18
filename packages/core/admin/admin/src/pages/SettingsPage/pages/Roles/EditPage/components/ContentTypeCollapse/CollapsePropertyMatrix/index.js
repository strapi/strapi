import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system';
import generateHeadersFromActions from './utils/generateHeadersFromActions';
import Header from './Header';
import ActionRow from './ActionRow';

const Wrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
`;

const CollapsePropertyMatrix = ({
  availableActions,
  childrenForm,
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
    <Wrapper>
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
  isFormDisabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  pathToData: PropTypes.string.isRequired,
  propertyName: PropTypes.string.isRequired,
};

export default CollapsePropertyMatrix;
