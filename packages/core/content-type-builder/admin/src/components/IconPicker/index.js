import React, { useEffect, useRef, useState } from 'react';

import {
  Box,
  Field,
  FieldInput,
  FieldLabel,
  Flex,
  Icon,
  IconButton,
  inputFocusStyle,
  Searchbar,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Search, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTrad } from '../../utils';

import { COMPONENT_ICONS } from './constants';

const IconPickerWrapper = styled(Flex)`
  label {
    ${inputFocusStyle}
    border-radius: ${({ theme }) => theme.borderRadius};
    border: 1px solid ${({ theme }) => theme.colors.neutral100};
  }
`;

const IconPick = ({ iconKey, name, onChange, isSelected, ariaLabel }) => {
  return (
    <Field name={name} required={false}>
      <FieldLabel htmlFor={iconKey} id={`${iconKey}-label`}>
        <VisuallyHidden>
          <FieldInput
            type="radio"
            id={iconKey}
            name={name}
            checked={isSelected}
            onChange={onChange}
            value={iconKey}
            aria-checked={isSelected}
            aria-labelledby={`${iconKey}-label`}
          />
          {ariaLabel}
        </VisuallyHidden>
        <Flex padding={2} cursor="pointer" hasRadius background={isSelected && 'primary200'}>
          <Icon as={COMPONENT_ICONS[iconKey]} color={isSelected ? 'primary600' : 'neutral300'} />
        </Flex>
      </FieldLabel>
    </Field>
  );
};

IconPick.propTypes = {
  iconKey: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  isSelected: PropTypes.bool.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

const IconPicker = ({ intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const allIcons = Object.keys(COMPONENT_ICONS);
  const [icons, setIcons] = useState(allIcons);
  const searchIconRef = useRef(null);
  const searchBarRef = useRef(null);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  const onChangeSearch = ({ target: { value } }) => {
    setSearch(value);
    setIcons(() => allIcons.filter((icon) => icon.toLowerCase().includes(value.toLowerCase())));
  };

  const onClearSearch = () => {
    toggleSearch();
    setSearch('');
    setIcons(allIcons);
  };

  const removeIconSelected = () => {
    onChange({ target: { name, value: '' } });
  };

  useEffect(() => {
    if (showSearch) {
      searchBarRef.current.focus();
    }
  }, [showSearch]);

  return (
    <>
      <Flex justifyContent="space-between" paddingBottom={2}>
        <Typography variant="pi" fontWeight="bold" textColor="neutral800" as="label">
          {formatMessage(intlLabel)}
        </Typography>
        <Flex gap={1}>
          {showSearch ? (
            <Searchbar
              ref={searchBarRef}
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
                defaultMessage: 'Clear the icon search',
              })}
            >
              {formatMessage({
                id: getTrad('IconPicker.search.placeholder.label'),
                defaultMessage: 'Search for an icon',
              })}
            </Searchbar>
          ) : (
            <IconButton
              ref={searchIconRef}
              onClick={toggleSearch}
              aria-label={formatMessage({
                id: getTrad('IconPicker.search.button.label'),
                defaultMessage: 'Search icon button',
              })}
              icon={<Search />}
              noBorder
            />
          )}
          {value && (
            <Tooltip
              description={formatMessage({
                id: getTrad('IconPicker.remove.tooltip'),
                defaultMessage: 'Remove the selected icon',
              })}
            >
              <IconButton
                onClick={removeIconSelected}
                aria-label={formatMessage({
                  id: getTrad('IconPicker.remove.button'),
                  defaultMessage: 'Remove the selected icon button',
                })}
                icon={<Trash />}
                noBorder
              />
            </Tooltip>
          )}
        </Flex>
      </Flex>
      <IconPickerWrapper
        position="relative"
        padding={1}
        background="neutral100"
        hasRadius
        wrap="wrap"
        gap={2}
        maxHeight="126px"
        overflow="auto"
        textAlign="center"
      >
        {icons.length > 0 ? (
          icons.map((iconKey) => (
            <IconPick
              key={iconKey}
              iconKey={iconKey}
              name={name}
              onChange={onChange}
              isSelected={iconKey === value}
              ariaLabel={formatMessage(
                {
                  id: getTrad('IconPicker.icon.label'),
                  defaultMessage: 'Select {icon} icon',
                },
                { icon: iconKey }
              )}
            />
          ))
        ) : (
          <Box padding={4} grow={2}>
            <Typography variant="delta" textColor="neutral600" textAlign="center">
              {formatMessage({
                id: getTrad('IconPicker.emptyState.label'),
                defaultMessage: 'No icon found',
              })}
            </Typography>
          </Box>
        )}
      </IconPickerWrapper>
    </>
  );
};

IconPicker.defaultProps = {
  value: '',
};

IconPicker.propTypes = {
  intlLabel: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default IconPicker;
