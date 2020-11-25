import React, { memo } from 'react';
import PropTypes from 'prop-types';
import MediaPreviewList from '../MediaPreviewList';
import RelationPreviewList from '../RelationPreviewList';
import { Truncate, Truncated } from './styledComponents';

const RowCell = ({ metadatas, type, value }) => {
  if (type === 'media') {
    return <MediaPreviewList files={value} />;
  }

  if (type === 'relation') {
    return <RelationPreviewList metadatas={metadatas} value={value} />;
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
};

RowCell.propTypes = {
  metadatas: PropTypes.object.isRequired,
  type: PropTypes.string,
  value: PropTypes.any,
};

export default memo(RowCell);
