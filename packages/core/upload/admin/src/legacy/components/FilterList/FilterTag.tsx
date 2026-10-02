import { Tag } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { FilterStructure } from './FilterList';

type FilterTagAttribute = {
  fieldSchema?: {
    type?: string; // "date" | "enumeration"
    options?: {
      label: string; // "audio" | "video" | "image" | "file"
      value: string; // "audio" | "video" | "image" | "file"
    }[];
  };
  metadatas?: {
    label?: string; // "createdAt" | "updatedAt" | "type"
  };
  name: string; // "createdAt" | "updatedAt" | "mime"
};

interface FilterTagProps {
  attribute: FilterTagAttribute;
  operator: string;
  value: string;
  filter: FilterStructure;
  onClick: (filter: FilterStructure) => void;
}

export const FilterTag = ({ attribute, filter, onClick, operator, value }: FilterTagProps) => {
  const { formatMessage, formatDate, formatTime } = useIntl();

  const handleClick = () => {
    onClick(filter);
  };

  const { fieldSchema } = attribute;

  const type = fieldSchema?.type;

  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatDate(value, { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute] = value.split(':');
    const date = new Date();
    date.setHours(Number(hour));
    date.setMinutes(Number(minute));

    formattedValue = formatTime(date, {
      hour: 'numeric',
      minute: 'numeric',
    });
  }

  const content = `${attribute.metadatas?.label} ${formatMessage({
    id: `components.FilterOptions.FILTER_TYPES.${operator}`,
    defaultMessage: operator,
  })} ${formattedValue}`;

  return (
    <Tag onClick={handleClick} icon={<Cross />} padding={1}>
      {content}
    </Tag>
  );
};
