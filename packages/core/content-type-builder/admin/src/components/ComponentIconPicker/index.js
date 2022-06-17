import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { AutoSizer, Collection } from 'react-virtualized';
import { Searchbar } from '@strapi/design-system/Searchbar';
import { IconButton } from '@strapi/design-system/IconButton';
import Search from '@strapi/icons/Search';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import Cell from './Cell';

const CELL_WIDTH = 44;

const ComponentIconPicker = ({ error, intlLabel, name, onChange, value }) => {
  const { allIcons } = useDataManager();
  const { formatMessage } = useIntl();

  const searchWrapperRef = useRef();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState(allIcons);
  const toggleSearch = () => setShowSearch(prev => !prev);

  useEffect(() => {
    if (showSearch) {
      searchWrapperRef.current.querySelector('input').focus();
    }
  }, [showSearch]);

  const handleChangeSearch = ({ target: { value } }) => {
    setSearch(value);
    setIcons(() => allIcons.filter(icon => icon.includes(value)));
  };

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  const cellSizeAndPositionGetter = ({ index }) => {
    const columnCount = 16;
    const columnPosition = index % (columnCount || 1);

    const height = CELL_WIDTH;
    const width = CELL_WIDTH;
    const x = columnPosition * (width + 1);
    const y = parseInt(index / 16, 10) * CELL_WIDTH;

    return {
      height,
      width,
      x,
      y,
    };
  };

  const cellCount = icons.length;

  return (
    <Box>
      <Stack spacing={1}>
        <Flex justifyContent="space-between">
          <Typography
            variant="pi"
            fontWeight="bold"
            textColor="neutral800"
            htmlFor={name}
            as="label"
          >
            {formatMessage(intlLabel)}
          </Typography>
          {showSearch ? (
            <div ref={searchWrapperRef} style={{ width: 206 }}>
              <Searchbar
                name="searchbar"
                onBlur={() => {
                  if (!search) {
                    toggleSearch();
                  }
                }}
                onClear={() => {
                  setSearch('');
                  setIcons(allIcons);
                  toggleSearch();
                }}
                value={search}
                onChange={handleChangeSearch}
                clearLabel="Clearing the icon search"
                placeholder={formatMessage({
                  id: getTrad('ComponentIconPicker.search.placeholder'),
                  defaultMessage: 'Search for an icon',
                })}
                size="S"
              >
                {formatMessage({
                  id: getTrad('ComponentIconPicker.search.placeholder'),
                  defaultMessage: 'Search for an icon',
                })}
              </Searchbar>
            </div>
          ) : (
            <IconButton onClick={toggleSearch} aria-label="Edit" icon={<Search />} noBorder />
          )}
        </Flex>
        <Stack spacing={1}>
          <Box background="neutral100" borderColor={error ? 'danger600' : ''} hasRadius>
            <Box>
              <AutoSizer disableHeight>
                {({ width }) => {
                  return (
                    <Collection
                      cellCount={cellCount}
                      cellRenderer={({ index, key, style }) => {
                        const icon = icons[index];
                        const isSelected = icon === value;
                        const handleClick = () => {
                          onChange({ target: { name, value: icon } });
                        };

                        return (
                          <div style={{ ...style, width: CELL_WIDTH }} key={key}>
                            <Cell
                              style={{ width: '100%', height: CELL_WIDTH }}
                              alignItems="center"
                              justifyContent="center"
                              onClick={handleClick}
                              isSelected={isSelected}
                              as="button"
                              type="button"
                            >
                              <FontAwesomeIcon icon={icon} />
                            </Cell>
                          </div>
                        );
                      }}
                      cellSizeAndPositionGetter={cellSizeAndPositionGetter}
                      height={132}
                      width={width}
                    />
                  );
                }}
              </AutoSizer>
            </Box>
          </Box>
          {error && (
            <Typography
              variant="pi"
              id={`${name}-error`}
              textColor="danger600"
              data-strapi-field-error
            >
              {errorMessage}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

ComponentIconPicker.defaultProps = {
  error: null,
};

ComponentIconPicker.propTypes = {
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};

export default ComponentIconPicker;
