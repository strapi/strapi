import React, { memo } from 'react';
import PropTypes from 'prop-types';
import MediaPreviewList from '../../MediaPreviewList';
import RelationPreviewList from '../../RelationPreviewList';
import Truncate from '../../Truncate';
import Truncated from '../../Truncated';

const RowCell = ({ metadatas, type, value, relationType }) => {
  if (type === 'media') {
    return <MediaPreviewList files={value} />;
  }

  if (type === 'relation') {
    return <RelationPreviewList relationType={relationType} metadatas={metadatas} value={value} />;
  }

  return (
    <Truncate>
      <Truncated title={value}>{value}</Truncated>
    </Truncate>
  );
};

RowCell.defaultProps = {
  type: null,
  value: null,
  relationType: null,
};

RowCell.propTypes = {
  metadatas: PropTypes.object.isRequired,
  relationType: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.any,
};

export default memo(RowCell);
