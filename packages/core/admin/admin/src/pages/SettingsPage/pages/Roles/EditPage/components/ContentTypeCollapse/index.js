import PropTypes from 'prop-types';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Collapse from './Collapse';
import CollapsePropertyMatrix from './CollapsePropertyMatrix';
import { getAvailableActions } from './utils';

const Wrapper = styled.div`
  flex-direction: column;
  display: inline-flex;
  min-width: 100%;
  ${({ theme, isActive }) => isActive && `border: 1px solid ${theme.colors.primary600};`}
`;

const ContentTypeCollapse = ({
  allActions,
  contentTypeName,
  label,
  index,
  isActive,
  isFormDisabled,
  onClickToggleCollapse,
  pathToData,
  properties,
}) => {
  const handleClickToggleCollapse = useCallback(() => {
    onClickToggleCollapse(contentTypeName);
  }, [contentTypeName, onClickToggleCollapse]);

  const availableActions = useMemo(() => {
    return getAvailableActions(allActions, contentTypeName);
  }, [allActions, contentTypeName]);

  return (
    <Wrapper isActive={isActive}>
      <Collapse
        availableActions={availableActions}
        isActive={isActive}
        isGrey={index % 2 === 0}
        isFormDisabled={isFormDisabled}
        label={label}
        onClickToggle={handleClickToggleCollapse}
        pathToData={pathToData}
      />
      {isActive &&
        properties.map(({ label: propertyLabel, value, children: childrenForm }) => {
          return (
            <CollapsePropertyMatrix
              availableActions={availableActions}
              childrenForm={childrenForm}
              isFormDisabled={isFormDisabled}
              label={propertyLabel}
              pathToData={pathToData}
              propertyName={value}
              key={value}
            />
          );
        })}
    </Wrapper>
  );
};

ContentTypeCollapse.propTypes = {
  allActions: PropTypes.array.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClickToggleCollapse: PropTypes.func.isRequired,
  pathToData: PropTypes.string.isRequired,
  properties: PropTypes.array.isRequired,
};

export default ContentTypeCollapse;
