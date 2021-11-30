import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import get from 'lodash/get';
import isNull from 'lodash/isNull';
import Select from 'react-select';
import SingleValue from './SingleValue';

function SelectOne({
  components,
  mainField,
  name,
  isDisabled,
  isLoading,
  onChange,
  onInputChange,
  onMenuClose,
  onMenuOpen,
  onMenuScrollToBottom,
  options,
  placeholder,
  styles,
  value,
  description,
}) {
  const { formatMessage } = useIntl();

  return (
    <Stack size={1}>
      <Select
        components={{
          ...components,
          SingleValue,
        }}
        id={name}
        isClearable
        isDisabled={isDisabled}
        isLoading={isLoading}
        mainField={mainField}
        options={options}
        onChange={onChange}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuOpen={onMenuOpen}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={formatMessage(
          placeholder || { id: 'components.Select.placeholder', defaultMessage: 'Select...' }
        )}
        styles={styles}
        value={isNull(value) ? null : { label: get(value, [mainField.name], ''), value }}
      />

      {description && (
        <Typography variant="pi" textColor="neutral600">
          {description}
        </Typography>
      )}
    </Stack>
  );
}

SelectOne.defaultProps = {
  description: '',
  components: {},
  placeholder: null,
  value: null,
};

SelectOne.propTypes = {
  components: PropTypes.object,
  isDisabled: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuOpen: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }),
  styles: PropTypes.object.isRequired,
  value: PropTypes.object,
  description: PropTypes.string,
};

export default memo(SelectOne);
