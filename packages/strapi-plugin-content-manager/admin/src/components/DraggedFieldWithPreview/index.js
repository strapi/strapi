import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
// import { FormattedMessage } from 'react-intl';
// import { Grab, Pencil, Remove } from '@buffetjs/icons';

// import pluginId from '../../pluginId';
// import PreviewCarret from '../PreviewCarret';
import Carret from './Carret';
import DraggedField from '../DraggedField';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const DraggedFieldWithPreview = forwardRef(
  ({ name, showLeftCarret, showRightCarret, size }, refs) => {
    const isHidden = name === '_TEMP_';

    return (
      <div style={{ width: `${(1 / 12) * size * 100}%` }}>
        <Wrapper ref={refs.dropRef}>
          {showLeftCarret && <Carret />}

          <div className="sub">
            <DraggedField
              ref={refs.dragRef}
              isHidden={isHidden}
              name={name}
              style={{ padding: 0, margin: 0 }}
            />
          </div>
          {showRightCarret && <Carret right />}
        </Wrapper>
      </div>
    );
  }
);

DraggedFieldWithPreview.defaultProps = {
  showLeftCarret: false,
  showRightCarret: false,
  size: 1,
};

DraggedFieldWithPreview.propTypes = {
  name: PropTypes.string.isRequired,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number,
};

export default DraggedFieldWithPreview;
