import React, { createRef, useEffect, useState } from 'react';
import { Label, ErrorMessage } from '@buffetjs/styles';
import { AutoSizer, Collection } from 'react-virtualized';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useDataManager from '../../hooks/useDataManager';
import CellRenderer from './CellRenderer';
import Search from './Search';
import SearchWrapper from './SearchWrapper';
import Wrapper from './Wrapper';

/* eslint-disable jsx-a11y/control-has-associated-label */

const ComponentIconPicker = ({ error, isCreating, label, name, onChange, value }) => {
  const { allIcons, allComponentsIconAlreadyTaken } = useDataManager();
  const initialIcons = allIcons.filter(ico => {
    if (isCreating) {
      return !allComponentsIconAlreadyTaken.includes(ico);
    }

    // Edition
    return !allComponentsIconAlreadyTaken.filter(icon => icon !== originalIcon).includes(ico);
  });
  const ref = createRef();
  const [originalIcon] = useState(value);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState(initialIcons);
  const toggleSearch = () => setShowSearch(prev => !prev);

  useEffect(() => {
    if (showSearch && ref.current) {
      ref.current.focus();
    }
  }, [ref, showSearch]);

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
      <div className="search">
        <Label htmlFor={name} style={{ marginBottom: 12 }}>
          {label}
        </Label>
        {!showSearch ? (
          <button onClick={toggleSearch} type="button">
            <FontAwesomeIcon icon="search" />
          </button>
        ) : (
          <SearchWrapper>
            <FontAwesomeIcon icon="search" />
            <button onClick={toggleSearch} type="button" />
            <Search
              ref={ref}
              onChange={({ target: { value } }) => {
                setSearch(value);
                setIcons(() => initialIcons.filter(icon => icon.includes(value)));
              }}
              value={search}
              placeholder="Search…"
            />
            <button
              onClick={() => {
                setSearch('');
                setIcons(initialIcons);
                toggleSearch();
              }}
              type="button"
            >
              <FontAwesomeIcon icon="times" />
            </button>
          </SearchWrapper>
        )}
      </div>
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
      {error && <ErrorMessage style={{ marginTop: 5, marginBottom: 16 }}>{error}</ErrorMessage>}
    </Wrapper>
  );
};

ComponentIconPicker.defaultProps = {
  error: null,
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
