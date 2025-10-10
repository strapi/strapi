import { Field, MultiSelectNested } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { IntlLabel } from '../types';

interface AllowedTypesSelectProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: (value: any) => void;
  value?: any;
}

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

export const AllowedTypesSelect = ({
  intlLabel,
  name,
  onChange,
  value = null,
}: AllowedTypesSelectProps) => {
  const { formatMessage } = useIntl();

  /* eslint-disable indent */
  const displayedValue =
    value === null || value?.length === 0
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
    <Field.Root name={name}>
      <Field.Label>{label}</Field.Label>
      <MultiSelectNested
        customizeContent={() => displayedValue}
        onChange={(values: any[]) => {
          if (values.length > 0) {
            onChange({ target: { name, value: values, type: 'allowed-types-select' } });
          } else {
            onChange({ target: { name, value: null, type: 'allowed-types-select' } });
          }
        }}
        options={options}
        value={value || []}
      />
    </Field.Root>
  );
};
