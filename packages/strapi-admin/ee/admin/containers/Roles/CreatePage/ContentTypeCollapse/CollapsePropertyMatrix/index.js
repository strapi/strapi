import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
// import { Padded, Flex, Text } from '@buffetjs/core';
import Header from './Header';
import Wrapper from './Wrapper';
import generateHeadersFromActions from './utils/generateHeadersFromActions';

const CollapsePropertyMatrix = ({ availableActions, isLast, isOdd, label, propertyName }) => {
  const propertyActions = useMemo(
    () => generateHeadersFromActions(availableActions, propertyName),
    [availableActions, propertyName]
  );

  return (
    <Wrapper withPadding={isOdd} isLast={isLast}>
      <Header label={label} headers={propertyActions} />
    </Wrapper>
  );
};

CollapsePropertyMatrix.propTypes = {
  availableActions: PropTypes.array.isRequired,
  isOdd: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  propertyName: PropTypes.string.isRequired,
};

export default CollapsePropertyMatrix;
