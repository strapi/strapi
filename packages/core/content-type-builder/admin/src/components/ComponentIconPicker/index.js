import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FixedSizeGrid } from 'react-window';
import { Searchbar, IconButton, Box, Flex, Stack, Typography } from '@strapi/design-system';
import Search from '@strapi/icons/Search';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getIndexFromColAndRow } from './utils/getIndexFromColAndRow';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import Cell from './Cell';

const CELL_WIDTH = 42;
const COLUMN_COUNT = 18;

const ComponentIconPicker = ({ error, intlLabel, name, onChange, value }) => {
  const { allIcons } = useDataManager();
  const { formatMessage } = useIntl();

  const searchWrapperRef = useRef();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState(allIcons);
  const toggleSearch = () => setShowSearch((prev) => !prev);

  useEffect(() => {
    if (showSearch) {
      searchWrapperRef.current.querySelector('input').focus();
    }
  }, [showSearch]);

  const handleChangeSearch = ({ target: { value } }) => {
    setSearch(value);
    setIcons(() => allIcons.filter((icon) => icon.includes(value)));
  };

  // eslint-disable-next-line react/prop-types
  const IconRenderer = ({ columnIndex, rowIndex, style }) => {
    const icon = icons[getIndexFromColAndRow(columnIndex, rowIndex, COLUMN_COUNT)];

    return (
      <div style={style} key={`col-${columnIndex}`}>
        {icon && (
          <Cell
            style={{ width: '100%', height: '100%' }}
            alignItems="center"
            justifyContent="center"
            onClick={() => {
              onChange({ target: { name, value: icon } });
            }}
            isSelected={icon === value}
            as="button"
            type="button"
          >
            <FontAwesomeIcon icon={icon} />
          </Cell>
        )}
      </div>
    );
  };

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

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
          <Box padding={1} background="neutral100" borderColor={error ? 'danger600' : ''} hasRadius>
            <FixedSizeGrid
              columnCount={COLUMN_COUNT}
              columnWidth={CELL_WIDTH}
              height={132}
              rowHeight={CELL_WIDTH}
              rowCount={Math.ceil(icons.length / COLUMN_COUNT)}
              width={CELL_WIDTH * COLUMN_COUNT}
            >
              {IconRenderer}
            </FixedSizeGrid>
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
