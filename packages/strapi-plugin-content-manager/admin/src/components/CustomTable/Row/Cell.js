import React, { memo } from 'react';
import PropTypes from 'prop-types';
import MediaPreviewList from '../../MediaPreviewList';
import RelationPreviewList from '../../RelationPreviewList';
import Truncate from '../../Truncate';
import Truncated from '../../Truncated';

const Cell = ({ options }) => {
  if (options.type === 'media') {
    return <MediaPreviewList files={options.value} />;
  }

  if (options.type === 'relation') {
    return <RelationPreviewList options={options} />;
  }

  return (
    <Truncate>
      <Truncated title={options.value}>{options.value}</Truncated>
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
    value: PropTypes.any,
  }).isRequired,
};

export default memo(Cell);
