import React, { memo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ContentTypeCollapse from '../ContentTypeCollapse';

const ContentTypeCollapses = ({ actions, subjects }) => {
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
  subjects: PropTypes.object,
};

export default memo(ContentTypeCollapses);
