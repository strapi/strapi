import parseISO from 'date-fns/parseISO';
import toString from 'lodash/toString';
import { useIntl } from 'react-intl';

import type { Schema } from '@strapi/types';

interface CellValueProps {
  type: Schema.Attribute.Kind | 'custom';
  value: any;
}

const CellValue = ({ type, value }: CellValueProps) => {
  const { formatDate, formatTime, formatNumber } = useIntl();
  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatDate(parseISO(value), { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute, second] = value.split(':');
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(second);

    formattedValue = formatTime(date, {
      timeStyle: 'short',
    });
  }

  if (['float', 'decimal'].includes(type)) {
    formattedValue = formatNumber(value, {
      // Should be kept in sync with the corresponding value
      // in the design-system/NumberInput: https://github.com/strapi/design-system/blob/main/packages/strapi-design-system/src/NumberInput/NumberInput.js#L53
      maximumFractionDigits: 20,
    });
  }

  if (['integer', 'biginteger'].includes(type)) {
    formattedValue = formatNumber(value, { maximumFractionDigits: 0 });
  }

  return toString(formattedValue);
};

export { CellValue };
export type { CellValueProps };
