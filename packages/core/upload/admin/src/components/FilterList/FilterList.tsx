// TODO: find a better naming convention for the file that was an index file before
/**
 *
 * FilterList
 *
 */
import { FilterTag } from './FilterTag';

type NumberKeyedObject = Record<number, string>;

type StringFilter = {
  [key: string]: string;
};

type MimeFilter = {
  [key: string]:
    | string
    | NumberKeyedObject
    | Record<string, string | NumberKeyedObject>
    | undefined;
};

export type FilterStructure = {
  [key: string]: MimeFilter | StringFilter | undefined;
};

/** Normalizes array or number-keyed object { 0: 'a', 1: 'b' } to string array */
const toMimeArray = (val: unknown): string[] | undefined => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    const values = Object.values(val);
    if (values.length > 0 && values.every((v) => typeof v === 'string')) return values as string[];
  }
  return undefined;
};

export interface FilterListProps {
  appliedFilters: FilterStructure[];
  filtersSchema: {
    name: string;
    metadatas?: {
      label?: string;
    };
    fieldSchema?: {
      type?: string;
      mainField?: {
        name: string;
        type: string;
      };
      options?: {
        label: string;
        value: string;
      }[];
    };
  }[];
  onRemoveFilter: (filters: FilterStructure[]) => void;
}

export const FilterList = ({ appliedFilters, filtersSchema, onRemoveFilter }: FilterListProps) => {
  const handleClick = (filter: FilterStructure) => {
    const [name] = Object.keys(filter);
    const filterObj = filter[name];
    const [filterType] = Object.keys(filterObj!);
    const filterValue = filterObj![filterType];

    const nextFilters = appliedFilters.filter((prevFilter) => {
      if (typeof filterValue === 'string') {
        return prevFilter[name]?.[filterType] !== decodeURIComponent(filterValue);
      }
      if (typeof filterValue === 'object' && filterValue !== null) {
        return JSON.stringify(prevFilter[name]?.[filterType]) !== JSON.stringify(filterValue);
      }
      return true;
    });

    onRemoveFilter(nextFilters);
  };

  return appliedFilters.map((filter, i) => {
    const attributeName = Object.keys(filter)[0];
    const attribute = filtersSchema.find(({ name }) => name === attributeName);

    if (!attribute) return null;

    const filterObj = filter[attributeName];
    const operator = Object.keys(filterObj!)[0];
    const rawValue = filterObj![operator];

    let value: string;
    if (Array.isArray(rawValue)) {
      value = rawValue.join(', ');
    } else if (typeof rawValue === 'object' && rawValue !== null) {
      const inner = (rawValue as { $contains?: unknown }).$contains;
      const arr = toMimeArray(inner ?? rawValue);
      value = arr ? arr.join(', ') : Object.values(rawValue).join(', ');
    } else {
      value = decodeURIComponent(rawValue!);
    }

    let displayedOperator = operator;
    if (attribute.name === 'mime') {
      const mimeArray = Array.isArray(rawValue)
        ? rawValue
        : toMimeArray((rawValue as { $contains?: unknown })?.$contains ?? rawValue);

      if (mimeArray?.includes('image') && mimeArray.includes('video')) {
        value = 'file';
        displayedOperator = operator === '$not' ? '$eq' : '$ne';
      } else {
        displayedOperator = operator === '$contains' ? '$eq' : '$ne';
      }
    }

    return (
      <FilterTag
        // eslint-disable-next-line react/no-array-index-key
        key={`${attributeName}-${i}`}
        attribute={attribute}
        filter={filter}
        onClick={handleClick}
        operator={displayedOperator}
        value={value as string}
      />
    );
  });
};
