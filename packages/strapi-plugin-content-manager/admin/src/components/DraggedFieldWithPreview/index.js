import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';
import Carret from './Carret';
import DraggedField from '../DraggedField';
import PreviewCarret from '../PreviewCarret';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const DraggedFieldWithPreview = forwardRef(
  (
    {
      name,
      onClickEdit,
      onClickRemove,
      selectedItem,
      showLeftCarret,
      showRightCarret,
      size,
      type,
    },
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
    const carretStyle = withLongerHeight ? { height: '102px' } : {};

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
                onClick={onClickEdit}
                onRemove={onClickRemove}
                selectedItem={selectedItem}
                style={{ padding: 0, margin: 0, display }}
                type={type}
                withLongerHeight={withLongerHeight}
              ></DraggedField>
            </div>
            {showRightCarret && <Carret right style={carretStyle} />}
          </>
        </Wrapper>
      </div>
    );
  }
);

DraggedFieldWithPreview.defaultProps = {
  onClickEdit: () => {},
  onClickRemove: () => {},
  selectedItem: '',
  showLeftCarret: false,
  showRightCarret: false,
  size: 1,
  type: 'string',
};

DraggedFieldWithPreview.propTypes = {
  name: PropTypes.string.isRequired,
  onClickEdit: PropTypes.func,
  onClickRemove: PropTypes.func,
  selectedItem: PropTypes.string,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number,
  type: PropTypes.string,
};

export default DraggedFieldWithPreview;
