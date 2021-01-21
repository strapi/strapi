import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import MediaPreviewList from '../../MediaPreviewList';
import RelationPreviewList from '../../RelationPreviewList';
import Truncate from '../../Truncate';
import Truncated from '../../Truncated';
import Tooltip from '../../Tooltip';

const Cell = ({ options }) => {
  const [tooltipIsDisplayed, setDisplayTooltip] = useState(false);

  const handleTooltipToggle = () => {
    setDisplayTooltip(prev => !prev);
  };

  const { type, cellId, value } = options;

  if (type === 'media') {
    return <MediaPreviewList files={value} />;
  }

  if (type === 'relation') {
    return <RelationPreviewList options={options} />;
  }

  return (
    <Truncate onMouseEnter={handleTooltipToggle} onMouseLeave={handleTooltipToggle}>
      <Truncated>
        <span data-for={cellId} data-tip={value}>
          {value}
        </span>
      </Truncated>
      {tooltipIsDisplayed && <Tooltip id={cellId} />}
    </Truncate>
  );
};

Cell.propTypes = {
  options: PropTypes.shape({
    cellId: PropTypes.string.isRequired,
    metadatas: PropTypes.shape({
      mainField: PropTypes.object,
    }).isRequired,
    name: PropTypes.string.isRequired,
    relationType: PropTypes.string,
    rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string,
    queryInfos: PropTypes.shape({
      endPoint: PropTypes.string.isRequired,
    }),
    value: PropTypes.any,
  }).isRequired,
};

export default memo(Cell);
