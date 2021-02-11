import React, { memo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ContentTypeCollapse from '../ContentTypeCollapse';

const ContentTypeCollapses = ({ actions, pathToData, subjects }) => {
  const [collapseToOpen, setCollapseToOpen] = useState(null);

  const handleClickToggleCollapse = useCallback(
    collapseName => {
      const nextCollapseToOpen = collapseToOpen === collapseName ? null : collapseName;

      setCollapseToOpen(nextCollapseToOpen);
    },
    [collapseToOpen]
  );

  return Object.keys(subjects).map((subject, index) => {
    return (
      <ContentTypeCollapse
        allActions={actions}
        key={subject}
        contentTypeName={subject}
        isActive={collapseToOpen === subject}
        index={index}
        onClickToggleCollapse={handleClickToggleCollapse}
        pathToData={`${pathToData}..${subject}`}
        properties={subjects[subject].properties}
      />
    );
  });
};

ContentTypeCollapses.defaultProps = {
  actions: [],
  subjects: {},
};

ContentTypeCollapses.propTypes = {
  actions: PropTypes.array.isRequired,
  pathToData: PropTypes.string.isRequired,
  subjects: PropTypes.object,
};

export default memo(ContentTypeCollapses);
