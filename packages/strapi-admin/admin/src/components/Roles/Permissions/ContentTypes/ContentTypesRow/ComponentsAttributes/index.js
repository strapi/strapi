import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Padded } from '@buffetjs/core';
import ComponentAttributeRow from 'ee_else_ce/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/ComponentAttributeRow';

// Custom timeline header style used only in this file.
const TopTimeline = styled.div`
  padding-top: 8px;
  width: 3px;
  background-color: #a5d5ff;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
`;

const ComponentsAttributes = ({ attributes, recursiveLevel }) => (
  <Padded left size="smd">
    <TopTimeline />
    {attributes &&
      attributes.map((attribute, index) => (
        <ComponentAttributeRow
          attribute={attribute}
          numberOfAttributes={attributes.length}
          key={attribute.attributeName}
          index={index}
          recursiveLevel={recursiveLevel}
        />
      ))}
  </Padded>
);

ComponentsAttributes.defaultProps = {
  recursiveLevel: 0,
};
ComponentsAttributes.propTypes = {
  attributes: PropTypes.array.isRequired,
  recursiveLevel: PropTypes.number,
};

export default ComponentsAttributes;
