import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
// import { FormattedMessage } from 'react-intl';
// import { Grab, Pencil, Remove } from '@buffetjs/icons';

// import pluginId from '../../pluginId';
import Carret from './Carret';
import DraggedField from '../DraggedField';
import PreviewCarret from '../PreviewCarret';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const DraggedFieldWithPreview = forwardRef(
  (
    { name, onClickRemove, showLeftCarret, showRightCarret, size, type },
    refs
  ) => {
    const isHidden = name === '_TEMP_';
    const [dragStart, setDragStart] = useState(false);
    const isFullSize = size === 12;
    const display = isFullSize && dragStart ? 'none' : '';
    const width = isFullSize && dragStart ? 0 : '100%';
    const withLongerHeight =
      ['json', 'text', 'file', 'media', 'group', 'richtext'].includes(type) &&
      !dragStart;
    const carretStyle = withLongerHeight ? { height: '84px' } : {};

    return (
      <div
        style={{ width: `${(1 / 12) * size * 100}%` }}
        onDrag={() => {
          if (isFullSize && !dragStart) {
            setDragStart(true);
          }
        }}
        onDragEnd={() => {
          if (isFullSize) {
            setDragStart(false);
          }
        }}
      >
        <Wrapper ref={refs.dropRef} withLongerHeight={withLongerHeight}>
          {dragStart && isFullSize && (
            <PreviewCarret style={{ marginRight: '-10px' }} />
          )}
          <>
            {showLeftCarret && <Carret style={carretStyle} />}

            <div className="sub" style={{ width }}>
              <DraggedField
                ref={refs.dragRef}
                isHidden={isHidden}
                name={name}
                onRemove={onClickRemove}
                style={{ padding: 0, margin: 0, display }}
                withLongerHeight={withLongerHeight}
              />
            </div>
            {showRightCarret && <Carret right style={carretStyle} />}
          </>
        </Wrapper>
      </div>
    );
  }
);

DraggedFieldWithPreview.defaultProps = {
  onClickRemove: () => {},
  showLeftCarret: false,
  showRightCarret: false,
  size: 1,
  type: 'string',
};

DraggedFieldWithPreview.propTypes = {
  name: PropTypes.string.isRequired,
  onClickRemove: PropTypes.func,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number,
  type: PropTypes.string,
};

export default DraggedFieldWithPreview;
