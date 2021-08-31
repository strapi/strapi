import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Collapse from './Collapse';
import CollapsePropertyMatrix from './CollapsePropertyMatrix';
import { getAvailableActions } from './utils';
import Wrapper from './Wrapper';

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

  const isOdd = useMemo(() => index % 2 !== 0, [index]);

  return (
    <Wrapper withMargin={isOdd}>
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
        properties.map(({ label, value, children: childrenForm }, i) => {
          return (
            <CollapsePropertyMatrix
              availableActions={availableActions}
              childrenForm={childrenForm}
              isFormDisabled={isFormDisabled}
              label={label}
              pathToData={pathToData}
              propertyName={value}
              key={value}
              isLast={i === properties.length - 1}
              isOdd={isOdd}
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
