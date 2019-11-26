import React from 'react';
import { Label, ErrorMessage } from '@buffetjs/styles';
import { AutoSizer, Collection } from 'react-virtualized';
import PropTypes from 'prop-types';
import CellRenderer from './CellRenderer';
import Wrapper from './Wrapper';
const GUTTER_SIZE = 0;

import icons from './utils/icons';

const ComponentIconPicker = ({ error, label, name }) => {
  const cellCount = icons.length;

  const cellSizeAndPositionGetter = ({ index }) => {
    const columnCount = 16;
    const columnPosition = index % (columnCount || 1);
    const height = 48;
    const width = 48;
    const x = columnPosition * (GUTTER_SIZE + width);
    const y = parseInt(index / 16, 10) * 48;

    return {
      height,
      width,
      x,
      y,
    };
  };

  return (
    <Wrapper>
      <Label htmlFor={name}>{label}</Label>
      <AutoSizer disableHeight>
        {({ width }) => {
          return (
            <Collection
              cellCount={cellCount}
              cellRenderer={CellRenderer}
              cellSizeAndPositionGetter={cellSizeAndPositionGetter}
              className="collection"
              height={144}
              width={width}
            />
          );
        }}
      </AutoSizer>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Wrapper>
  );
};

ComponentIconPicker.propTypes = {
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default ComponentIconPicker;
