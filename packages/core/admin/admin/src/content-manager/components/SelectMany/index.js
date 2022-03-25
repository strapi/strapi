import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import isEmpty from 'lodash/isEmpty';
import Select, { createFilter } from 'react-select';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import ListItem from './ListItem';

function SelectMany({
  addRelation,
  components,
  displayNavigationLink,
  mainField,
  name,
  isDisabled,
  isLoading,
  onInputChange,
  onMenuClose,
  onMenuOpen,
  onMenuScrollToBottom,
  onRemove,
  options,
  placeholder,
  searchToPersist,
  styles,
  targetModel,
  value,
  description,
}) {
  const { formatMessage } = useIntl();

  const filterConfig = {
    ignoreCase: true,
    ignoreAccents: true,
    trim: false,
    matchFrom: 'any',
  };

  return (
    <Stack spacing={1}>
      <Select
        components={components}
        isDisabled={isDisabled}
        id={name}
        filterOption={(candidate, input) => {
          if (!isEmpty(value)) {
            const isSelected = value.findIndex(item => item.id === candidate.value.id) !== -1;

            if (isSelected) {
              return false;
            }
          }

          if (input) {
            return createFilter(filterConfig)(candidate, input);
          }

          return true;
        }}
        mainField={mainField}
        isLoading={isLoading}
        isMulti
        isSearchable
        options={options}
        onChange={addRelation}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuOpen={onMenuOpen}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={formatMessage(
          placeholder || { id: 'global.select', defaultMessage: 'Select...' }
        )}
        styles={styles}
        value={[]}
      />
      <Box paddingTop={3} style={{ overflow: 'auto' }}>
        <Stack as="ul" spacing={4} style={{ maxHeight: '128px', overflowX: 'hidden' }}>
          {value?.map((data, index) => {
            return (
              <ListItem
                key={data.id}
                data={data}
                displayNavigationLink={displayNavigationLink}
                isDisabled={isDisabled}
                mainField={mainField}
                onRemove={() => {
                  if (!isDisabled) {
                    onRemove(`${name}.${index}`);
                  }
                }}
                searchToPersist={searchToPersist}
                targetModel={targetModel}
              />
            );
          })}
        </Stack>
      </Box>
      {description && (
        <Typography variant="pi" textColor="neutral600">
          {description}
        </Typography>
      )}
    </Stack>
  );
}

SelectMany.defaultProps = {
  description: '',
  components: {},
  placeholder: null,
  searchToPersist: null,
  value: null,
};

SelectMany.propTypes = {
  addRelation: PropTypes.func.isRequired,
  components: PropTypes.object,
  displayNavigationLink: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuOpen: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }),
  searchToPersist: PropTypes.string,
  styles: PropTypes.object.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.array,
  description: PropTypes.string,
};

export default memo(SelectMany);
