import React, { useState } from 'react';
import { Box, Flex, Icon, Typography, Searchbar, IconButton } from '@strapi/design-system';
import * as Icons from '@strapi/icons';
import { useIntl } from 'react-intl';
import { inputFocusStyle } from '@strapi/design-system';
import styled from 'styled-components';
import { getTrad } from '../../utils';

const IconPickerWrapper = styled(Flex)`
  position: relative;

  label {
    border-radius: 4px;
    ${inputFocusStyle}
  }

  input {
    position: absolute;
    opacity: 0;
  }
`;

const IconPick = ({ iconKey, name, onChange, isSelected }) => {
  return (
    <label htmlFor={iconKey}>
      <input
        id={iconKey}
        name={name}
        checked={isSelected}
        onChange={onChange}
        value={iconKey}
        type="radio"
      />
      <Box padding={2} cursor="pointer" hasRadius background={isSelected ? 'primary200' : null}>
        <Icon as={Icons[iconKey]} color={isSelected ? 'primary600' : 'neutral300'} />
      </Box>
    </label>
  );
};

const IconPicker = ({ intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const allIcons = Object.keys(Icons);
  const [icons, setIcons] = useState(allIcons);

  const SearchIcon = Icons['Search'];

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  const onChangeSearch = ({ target: { value } }) => {
    setSearch(value);
    setIcons(() => allIcons.filter((icon) => icon.toLowerCase().includes(value.toLowerCase())));
  };

  const onClearSearch = () => {
    setSearch('');
    setIcons(allIcons);
    setShowSearch(false);
  };

  return (
    <Box>
      <Flex justifyContent="space-between">
        <Typography variant="pi" fontWeight="bold" textColor="neutral800" as="label">
          {formatMessage(intlLabel)}
        </Typography>
        {showSearch ? (
          <Searchbar
            name="searchbar"
            size="S"
            placeholder={formatMessage({
              id: getTrad('ComponentIconPicker.search.placeholder'),
              defaultMessage: 'Search for an icon',
            })}
            onBlur={() => {
              if (!search) {
                toggleSearch();
              }
            }}
            onChange={onChangeSearch}
            value={search}
            onClear={onClearSearch}
            clearLabel={formatMessage({
              id: getTrad('IconPicker.search.clear.label'),
              defaultMessage: 'Clearing the icon search',
            })}
          />
        ) : (
          <IconButton onClick={toggleSearch} aria-label="Edit" icon={<SearchIcon />} noBorder />
        )}
      </Flex>
      <IconPickerWrapper
        padding={1}
        background="neutral100"
        hasRadius
        wrap="wrap"
        gap={2}
        maxHeight="126px"
        overflow="auto"
      >
        {icons.map((iconKey) => (
          <IconPick
            key={iconKey}
            iconKey={iconKey}
            name={name}
            onChange={onChange}
            isSelected={iconKey === value}
          />
        ))}
      </IconPickerWrapper>
    </Box>
  );
};

export default IconPicker;
