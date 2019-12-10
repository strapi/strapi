import React, { useState } from 'react';
import { Label, ErrorMessage } from '@buffetjs/styles';
import { AutoSizer, Collection } from 'react-virtualized';
import PropTypes from 'prop-types';
import useDataManager from '../../hooks/useDataManager';
import CellRenderer from './CellRenderer';
import Wrapper from './Wrapper';

const ComponentIconPicker = ({
  error,
  isCreating,
  label,
  name,
  onChange,
  value,
}) => {
  const { allIcons, allComponentsIconAlreadyTaken } = useDataManager();
  const [originalIcon] = useState(value);

  const icons = allIcons.filter(ico => {
    if (isCreating) {
      return !allComponentsIconAlreadyTaken.includes(ico);
    }

    // Edition
    return !allComponentsIconAlreadyTaken
      .filter(icon => icon !== originalIcon)
      .includes(ico);
  });

  const cellCount = icons.length;

  const cellSizeAndPositionGetter = ({ index }) => {
    const columnCount = 16;
    const columnPosition = index % (columnCount || 1);

    const height = 48;
    const width = 52;
    let x = columnPosition * width;

    if (x === 0) {
      x = 8;
    }

    const y = parseInt(index / 16, 10) * 48;

    return {
      height,
      width,
      x,
      y,
    };
  };

  return (
    <Wrapper error={error !== null}>
      <Label htmlFor={name} style={{ marginBottom: 12 }}>
        {label}
      </Label>
      <AutoSizer disableHeight>
        {({ width }) => {
          return (
            <Collection
              cellCount={cellCount}
              cellRenderer={({ key, index, ...rest }) => {
                return (
                  <CellRenderer
                    {...rest}
                    key={key}
                    icon={icons[index]}
                    name={name}
                    value={value}
                    onChange={onChange}
                  />
                );
              }}
              cellSizeAndPositionGetter={cellSizeAndPositionGetter}
              className="collection"
              height={144}
              width={width + 4}
            />
          );
        }}
      </AutoSizer>
      {error && (
        <ErrorMessage style={{ marginTop: 5, marginBottom: 16 }}>
          {error}
        </ErrorMessage>
      )}
    </Wrapper>
  );
};

ComponentIconPicker.propTypes = {
  error: PropTypes.string,
  isCreating: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};

export default ComponentIconPicker;
