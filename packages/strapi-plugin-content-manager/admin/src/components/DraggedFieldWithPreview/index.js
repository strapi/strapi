import React, { forwardRef, Fragment, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Grab, Pencil, Remove } from '@buffetjs/icons';

import pluginId from '../../pluginId';
import PreviewCarret from '../PreviewCarret';
import Carret from './Carret';
import DraggedField from '../DraggedField';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const DraggedFieldWithPreview = forwardRef(
  ({ name, showLeftCarret, showRightCarret, size }, ref) => {
    const isHidden = name === '_TEMP_';

    return (
      <div style={{ width: `${(1 / 12) * size * 100}%` }}>
        <Wrapper>
          {showLeftCarret && <Carret />}

          <div className="sub">
            <DraggedField
              ref={ref}
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

export default DraggedFieldWithPreview;
