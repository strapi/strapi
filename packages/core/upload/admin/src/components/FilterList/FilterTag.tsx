import { Tag } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

type FilterTagAttribute = {
  fieldSchema: {
    type: string; // "date" | "enumeration"
    options?: {
      label: string; // "audio" | "video" | "image" | "file"
      value: string; // "audio" | "video" | "image" | "file"
    }[];
  };
  metadatas: {
    label: string; // "createdAt" | "updatedAt" | "type"
  };
  name: string; // "createdAt" | "updatedAt" | "mime"
};

type NumberKeyedObject = {
  [key: number]: string;
};

type MimeFilter = {
  $contains?: string | NumberKeyedObject;
  $notContains?: string | NumberKeyedObject;
  $not?: {
    $contains?: string | NumberKeyedObject;
  };
};

type FilterKey = 'createdAt' | 'updatedAt' | 'mime';
type Operator = '$eq' | '$ne' | '$gt' | '$gte';

type MimeFilterOperator = keyof MimeFilter;

type FilterTagFilter = {
  [key in FilterKey]?: key extends 'mime'
    ? MimeFilter
    : {
        [key in Operator]?: string;
      };
};

interface FilterTagProps {
  attribute: FilterTagAttribute;
  filter: FilterTagFilter;
  onClick: (filter: FilterTagFilter) => void;
  operator: Operator | MimeFilterOperator;
  value?: string | NumberKeyedObject | { $contains?: string | NumberKeyedObject };
}

const FilterTag = ({ attribute, filter, onClick, operator, value }: FilterTagProps) => {
  const { formatMessage, formatDate, formatTime } = useIntl();

  const handleClick = () => {
    onClick(filter);
  };

  const { fieldSchema } = attribute;

  const type = fieldSchema.type;

  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatDate(value as string, { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatDate(value as string, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute] = (value as string).split(':');
    const date = new Date();
    date.setHours(Number(hour));
    date.setMinutes(Number(minute));

    formattedValue = formatTime(date, {
      hour: 'numeric',
      minute: 'numeric',
    });
  }

  const content = `${attribute.metadatas.label} ${formatMessage({
    id: `components.FilterOptions.FILTER_TYPES.${operator}`,
    defaultMessage: operator,
  })} ${formattedValue}`;

  return (
    <Tag onClick={handleClick} icon={<Cross />} padding={1}>
      {content}
    </Tag>
  );
};

export default FilterTag;
