import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Collapse from './Collapse';
import CollapseContent from './CollapseContent';
import getAvailableActions from './utils/getAvailableActions';
import Wrapper from './Wrapper';

const ContentTypeCollapse = ({
  allActions,
  contentTypeName,
  index,
  isActive,
  onClickToggleCollapse,
  properties,
}) => {
  const handleClickToggleCollapse = useCallback(() => {
    onClickToggleCollapse(contentTypeName);
  }, [contentTypeName, onClickToggleCollapse]);

  const availableActions = useMemo(() => {
    return getAvailableActions(allActions, contentTypeName);
  }, [allActions, contentTypeName]);

  return (
    <Wrapper withMargin={index % 2 !== 0}>
      <Collapse
        availableActions={availableActions}
        isActive={isActive}
        isGrey={index % 2 === 0}
        name={contentTypeName}
        onClickToggle={handleClickToggleCollapse}
      />
      {isActive &&
        properties.map(({ label, key, values }) => {
          return <CollapseContent label={label} key={key} values={values} />;
        })}
    </Wrapper>
  );
};

ContentTypeCollapse.propTypes = {
  allActions: PropTypes.array.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClickToggleCollapse: PropTypes.func.isRequired,
  properties: PropTypes.array.isRequired,
};

export default ContentTypeCollapse;
