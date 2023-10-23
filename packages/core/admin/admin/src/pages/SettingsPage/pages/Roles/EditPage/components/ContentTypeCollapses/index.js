import React, { memo, useState } from 'react';

import PropTypes from 'prop-types';

import ContentTypeCollapse from '../ContentTypeCollapse';

const ContentTypeCollapses = ({ actions, isFormDisabled, pathToData, subjects }) => {
  const [collapseToOpen, setCollapseToOpen] = useState(null);

  const handleClickToggleCollapse = (collapseName) => {
    const nextCollapseToOpen = collapseToOpen === collapseName ? null : collapseName;

    setCollapseToOpen(nextCollapseToOpen);
  };

  return subjects.map(({ uid, label, properties }, index) => {
    return (
      <ContentTypeCollapse
        allActions={actions}
        key={uid}
        contentTypeName={uid}
        label={label}
        isActive={collapseToOpen === uid}
        isFormDisabled={isFormDisabled}
        index={index}
        onClickToggleCollapse={handleClickToggleCollapse}
        pathToData={`${pathToData}..${uid}`}
        properties={properties}
      />
    );
  });
};

ContentTypeCollapses.defaultProps = {
  actions: [],
  subjects: [],
};

ContentTypeCollapses.propTypes = {
  actions: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  pathToData: PropTypes.string.isRequired,
  subjects: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      properties: PropTypes.array.isRequired,
    })
  ),
};

export default memo(ContentTypeCollapses);
