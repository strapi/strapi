import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { MultiSelectNested } from '@strapi/design-system/Select';
import upperFirst from 'lodash/upperFirst';

const options = [
  {
    label: 'All',
    children: [
      { label: 'images (JPEG, PNG, GIF, SVG, TIFF, ICO, DVU)', value: 'images' },
      { label: 'videos (MPEG, MP4, Quicktime, WMV, AVI, FLV)', value: 'videos' },
      { label: 'audios (MP3, WAV, OGG)', value: 'audios' },
      { label: 'files (CSV, ZIP, PDF, Excel, JSON, ...)', value: 'files' },
    ],
  },
];

const AllowedTypesSelect = ({ intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();

  /* eslint-disable indent */
  const displayedValue =
    value === null || value.length === 0
      ? formatMessage({ id: 'global.none', defaultMessage: 'None' })
      : [...value]
          .sort()
          .map((v) => upperFirst(v))
          .join(', ');

  /* eslint-enable indent */

  const label = intlLabel.id
    ? formatMessage({ id: intlLabel.id, defaultMessage: intlLabel.defaultMessage })
    : name;

  return (
    <MultiSelectNested
      id="select1"
      label={label}
      customizeContent={() => displayedValue}
      onChange={(values) => {
        if (values.length > 0) {
          onChange({ target: { name, value: values, type: 'allowed-types-select' } });
        } else {
          onChange({ target: { name, value: null, type: 'allowed-types-select' } });
        }
      }}
      options={options}
      value={value || []}
    />
  );
};

AllowedTypesSelect.defaultProps = {
  value: null,
};

AllowedTypesSelect.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default AllowedTypesSelect;
