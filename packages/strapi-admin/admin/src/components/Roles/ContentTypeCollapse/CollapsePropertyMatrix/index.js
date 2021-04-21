import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import generateHeadersFromActions from './utils/generateHeadersFromActions';
import Header from './Header';
import ActionRow from './ActionRow';
import Wrapper from './Wrapper';

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
      <Padded left size="md">
        {childrenForm.map(({ children: childrenForm, label, value, required }) => (
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
          />
        ))}
      </Padded>
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
