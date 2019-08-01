/**
 *
 * DraggedRemovedIcon
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import Span from './components';

function DraggedRemovedIcon({
  isDragging,
  onRemove,
  withLongerHeight,
  ...rest
}) {
  return (
    <Span
      isDragging={isDragging}
      withLongerHeight={withLongerHeight}
      onClick={onRemove}
      {...rest}
    />
  );
}

DraggedRemovedIcon.defaultProps = {
  isDragging: false,
  onRemove: () => {},
  withLongerHeight: false,
};

DraggedRemovedIcon.propTypes = {
  isDragging: PropTypes.bool,
  onRemove: PropTypes.func,
  withLongerHeight: PropTypes.bool,
};

export default memo(DraggedRemovedIcon);
