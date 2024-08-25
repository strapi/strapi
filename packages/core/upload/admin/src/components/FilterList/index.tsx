import FilterTag from './FilterTag';

type FilterSchema = {
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

type AppliedFilter = {
  [key in FilterKey]?: key extends 'mime'
    ? MimeFilter
    : {
        [key in Operator]?: string;
      };
};

interface FilterListProps {
  appliedFilters: AppliedFilter[];
  filtersSchema?: FilterSchema[];
  onRemoveFilter: (filters: AppliedFilter[]) => void;
}

const FilterList = ({ appliedFilters, filtersSchema = [], onRemoveFilter }: FilterListProps) => {
  const handleClick = (filter: AppliedFilter) => {
    const nextFilters = appliedFilters.filter((prevFilter) => {
      const name = Object.keys(filter)[0] as FilterKey;
      const filterObj = filter[name];
      if (!filterObj) return true; // Skip if filterObj is undefined

      const filterType = Object.keys(filterObj)[0] as Operator | MimeFilterOperator;
      const value = filterObj[filterType as keyof typeof filterObj];

      return prevFilter[name]?.[filterType as keyof (typeof prevFilter)[typeof name]] !== value;
    });

    onRemoveFilter(nextFilters);
  };

  return appliedFilters.map((filter, i) => {
    const attributeName = Object.keys(filter)[0] as FilterKey;
    const attribute = filtersSchema.find(({ name }) => name === attributeName) as FilterSchema;

    const filterObj = filter[attributeName];
    if (!filterObj) return null; // Skip if filterObj is undefined

    const operator = Object.keys(filterObj)[0] as Operator | MimeFilterOperator;
    // let value = filterObj[operator];
    let value:
      | string
      | NumberKeyedObject
      | { $contains?: string | NumberKeyedObject | undefined }
      | undefined;

    let displayedOperator = operator;

    if (attribute?.name === 'mime') {
      const mimeFilter = filterObj as MimeFilter;
      value = mimeFilter[operator as MimeFilterOperator];
      displayedOperator = operator === '$contains' ? '$eq' : '$ne';

      // Type is file
      // The filter for the file is the following: { mime: {$not: {$contains: ['image', 'video']}}}
      if (operator === '$not') {
        value = 'file';
        displayedOperator = '$eq';
      }

      // Here the type is file and the filter is not file
      // { mime: {$contains: ['image', 'video'] }}
      if (
        value !== undefined &&
        ['image', 'video'].includes((value as NumberKeyedObject)?.[0]) &&
        ['image', 'video'].includes((value as NumberKeyedObject)[1])
      ) {
        value = 'file';
        displayedOperator = '$ne';
      }
    } else {
      const generalFilter = filterObj as { [key in Operator]?: string };
      value = generalFilter[operator as Operator];
    }

    return (
      <FilterTag
        // eslint-disable-next-line react/no-array-index-key
        key={`${attributeName}-${i}`}
        attribute={attribute}
        filter={filter}
        onClick={handleClick}
        operator={displayedOperator}
        value={value}
      />
    );
  });
};

export default FilterList;
